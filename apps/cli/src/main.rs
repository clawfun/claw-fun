use clap::Parser;
use console::style;
use indicatif::{ProgressBar, ProgressStyle};
use rayon::prelude::*;
use solana_sdk::signature::Keypair;
use solana_sdk::signer::Signer;
use std::fs::File;
use std::io::Write;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

#[derive(Parser, Debug)]
#[command(name = "claw-miner")]
#[command(author = "CLAW.FUN Team")]
#[command(version = "0.1.0")]
#[command(about = "Mine Solana vanity addresses ending in 'claw'", long_about = None)]
struct Args {
    /// Suffix to mine for (case-insensitive)
    #[arg(short, long, default_value = "claw")]
    suffix: String,

    /// Number of threads to use (default: all CPUs)
    #[arg(short, long)]
    threads: Option<usize>,

    /// Output file for the keypair (default: keypair-{address}.json)
    #[arg(short, long)]
    output: Option<String>,

    /// Number of keypairs to find before stopping
    #[arg(short, long, default_value = "1")]
    count: usize,

    /// Case sensitive matching
    #[arg(short = 'C', long)]
    case_sensitive: bool,
}

fn main() {
    let args = Args::parse();

    println!();
    println!(
        "{}",
        style("  ██████╗██╗      █████╗ ██╗    ██╗").green().bold()
    );
    println!(
        "{}",
        style(" ██╔════╝██║     ██╔══██╗██║    ██║").green().bold()
    );
    println!(
        "{}",
        style(" ██║     ██║     ███████║██║ █╗ ██║").green().bold()
    );
    println!(
        "{}",
        style(" ██║     ██║     ██╔══██║██║███╗██║").green().bold()
    );
    println!(
        "{}",
        style(" ╚██████╗███████╗██║  ██║╚███╔███╔╝").green().bold()
    );
    println!(
        "{}",
        style("  ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ").green().bold()
    );
    println!();
    println!(
        "{}",
        style("  Solana Vanity Address Miner").cyan().bold()
    );
    println!();

    let suffix = if args.case_sensitive {
        args.suffix.clone()
    } else {
        args.suffix.to_lowercase()
    };

    let num_threads = args.threads.unwrap_or_else(num_cpus::get);

    // Calculate expected attempts
    let suffix_len = suffix.len();
    let base58_chars = 58u64;
    let expected_attempts = base58_chars.pow(suffix_len as u32);

    println!(
        "  {} Mining for addresses ending in '{}'",
        style("⛏").yellow(),
        style(&args.suffix).green().bold()
    );
    println!(
        "  {} Using {} threads",
        style("🧵").yellow(),
        style(num_threads).cyan()
    );
    println!(
        "  {} Expected attempts: ~{}",
        style("📊").yellow(),
        style(format_number(expected_attempts)).cyan()
    );
    println!(
        "  {} Finding {} keypair(s)",
        style("🎯").yellow(),
        style(args.count).cyan()
    );
    println!();

    rayon::ThreadPoolBuilder::new()
        .num_threads(num_threads)
        .build_global()
        .expect("Failed to build thread pool");

    let found_count = Arc::new(AtomicU64::new(0));
    let attempts = Arc::new(AtomicU64::new(0));
    let should_stop = Arc::new(AtomicBool::new(false));

    let pb = ProgressBar::new_spinner();
    pb.set_style(
        ProgressStyle::default_spinner()
            .template("{spinner:.green} {msg}")
            .unwrap(),
    );

    let start_time = Instant::now();
    let target_count = args.count as u64;
    let case_sensitive = args.case_sensitive;
    let output_template = args.output.clone();

    // Spawn progress reporter
    let attempts_clone = Arc::clone(&attempts);
    let found_clone = Arc::clone(&found_count);
    let should_stop_clone = Arc::clone(&should_stop);
    let pb_clone = pb.clone();

    std::thread::spawn(move || {
        let mut last_attempts = 0u64;
        let mut last_time = Instant::now();

        loop {
            std::thread::sleep(Duration::from_millis(500));

            if should_stop_clone.load(Ordering::Relaxed) {
                break;
            }

            let current_attempts = attempts_clone.load(Ordering::Relaxed);
            let current_found = found_clone.load(Ordering::Relaxed);
            let elapsed = last_time.elapsed().as_secs_f64();
            let rate = (current_attempts - last_attempts) as f64 / elapsed;

            pb_clone.set_message(format!(
                "Attempts: {} | Rate: {}/s | Found: {}",
                format_number(current_attempts),
                format_number(rate as u64),
                current_found
            ));

            last_attempts = current_attempts;
            last_time = Instant::now();
        }
    });

    // Mining loop
    let results: Vec<Keypair> = (0..num_threads)
        .into_par_iter()
        .flat_map(|_| {
            let mut local_results = Vec::new();
            let mut local_attempts = 0u64;

            loop {
                if should_stop.load(Ordering::Relaxed) {
                    break;
                }

                let keypair = Keypair::new();
                let pubkey = keypair.pubkey().to_string();
                local_attempts += 1;

                // Report attempts every 10000
                if local_attempts % 10000 == 0 {
                    attempts.fetch_add(10000, Ordering::Relaxed);
                }

                let matches = if case_sensitive {
                    pubkey.ends_with(&suffix)
                } else {
                    pubkey.to_lowercase().ends_with(&suffix)
                };

                if matches {
                    let current_found = found_count.fetch_add(1, Ordering::Relaxed) + 1;

                    pb.suspend(|| {
                        println!();
                        println!(
                            "  {} Found keypair #{}: {}",
                            style("✓").green().bold(),
                            current_found,
                            style(&pubkey).green().bold()
                        );
                    });

                    // Save keypair
                    let filename = output_template
                        .clone()
                        .unwrap_or_else(|| format!("keypair-{}.json", &pubkey[..8]));

                    let keypair_bytes: Vec<u8> = keypair.to_bytes().to_vec();
                    let json = serde_json::to_string_pretty(&keypair_bytes)
                        .expect("Failed to serialize keypair");

                    File::create(&filename)
                        .and_then(|mut f| f.write_all(json.as_bytes()))
                        .expect("Failed to write keypair file");

                    pb.suspend(|| {
                        println!(
                            "  {} Saved to: {}",
                            style("📁").yellow(),
                            style(&filename).cyan()
                        );
                    });

                    local_results.push(keypair);

                    if current_found >= target_count {
                        should_stop.store(true, Ordering::Relaxed);
                        break;
                    }
                }
            }

            local_results
        })
        .collect();

    pb.finish_and_clear();

    let elapsed = start_time.elapsed();
    let total_attempts = attempts.load(Ordering::Relaxed);

    println!();
    println!(
        "  {} Mining complete!",
        style("🎉").green()
    );
    println!(
        "  {} Found {} keypair(s) in {:.2}s",
        style("📊").yellow(),
        style(results.len()).green().bold(),
        elapsed.as_secs_f64()
    );
    println!(
        "  {} Total attempts: {}",
        style("📈").yellow(),
        format_number(total_attempts)
    );
    println!(
        "  {} Average rate: {}/s",
        style("⚡").yellow(),
        format_number((total_attempts as f64 / elapsed.as_secs_f64()) as u64)
    );
    println!();
}

fn format_number(n: u64) -> String {
    if n >= 1_000_000_000 {
        format!("{:.2}B", n as f64 / 1_000_000_000.0)
    } else if n >= 1_000_000 {
        format!("{:.2}M", n as f64 / 1_000_000.0)
    } else if n >= 1_000 {
        format!("{:.2}K", n as f64 / 1_000.0)
    } else {
        n.to_string()
    }
}
