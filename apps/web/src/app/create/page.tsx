"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { Keypair } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { VanityMiner } from "@/components/vanity-miner";
import { shortenAddress } from "@/lib/utils";
import toast from "react-hot-toast";
import { Sparkles, Upload, Zap, Check } from "lucide-react";

interface TokenFormData {
  name: string;
  symbol: string;
  description: string;
  image: File | null;
  twitter?: string;
  telegram?: string;
  website?: string;
}

export default function CreateTokenPage() {
  const router = useRouter();
  const { connected, publicKey } = useWallet();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<TokenFormData>({
    name: "",
    symbol: "",
    description: "",
    image: null,
  });
  const [vanityKeypair, setVanityKeypair] = useState<Keypair | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, image: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVanityFound = (keypair: Keypair) => {
    setVanityKeypair(keypair);
    toast.success(`Found vanity address: ${shortenAddress(keypair.publicKey.toString())}`);
  };

  const handleCreate = async () => {
    if (!connected || !publicKey || !vanityKeypair) {
      toast.error("Please connect wallet and mine a vanity address");
      return;
    }

    setIsCreating(true);
    try {
      // TODO: Upload image to IPFS
      // TODO: Create token transaction

      toast.success("Token created successfully!");
      router.push(`/token/${vanityKeypair.publicKey.toString()}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create token");
    } finally {
      setIsCreating(false);
    }
  };

  const canProceedStep1 = formData.name && formData.symbol && formData.description;
  const canProceedStep2 = vanityKeypair !== null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Create Your Token</h1>
        <p className="text-dark-400">
          Launch a token with a vanity address ending in &quot;claw&quot;
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                step >= s
                  ? "bg-claw-500 text-white"
                  : "bg-dark-800 text-dark-400"
              }`}
            >
              {step > s ? <Check className="w-5 h-5" /> : s}
            </div>
            {s < 3 && (
              <div
                className={`w-16 h-1 mx-2 ${
                  step > s ? "bg-claw-500" : "bg-dark-800"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Token Info */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Token Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Token Name"
                placeholder="My Awesome Token"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
              <Input
                label="Symbol"
                placeholder="MAT"
                value={formData.symbol}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    symbol: e.target.value.toUpperCase(),
                  })
                }
                maxLength={10}
              />
            </div>

            <div>
              <label className="label">Description</label>
              <textarea
                className="input min-h-[100px] resize-none"
                placeholder="Describe your token..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div>
              <label className="label">Token Image</label>
              <div className="flex items-center gap-4">
                <label className="flex-1 border-2 border-dashed border-dark-700 rounded-lg p-6 cursor-pointer hover:border-dark-600 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                  <div className="text-center">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-20 h-20 mx-auto rounded-lg object-cover"
                      />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto text-dark-400 mb-2" />
                        <p className="text-dark-400 text-sm">
                          Click to upload image
                        </p>
                      </>
                    )}
                  </div>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Twitter (optional)"
                placeholder="@username"
                value={formData.twitter || ""}
                onChange={(e) =>
                  setFormData({ ...formData, twitter: e.target.value })
                }
              />
              <Input
                label="Telegram (optional)"
                placeholder="t.me/group"
                value={formData.telegram || ""}
                onChange={(e) =>
                  setFormData({ ...formData, telegram: e.target.value })
                }
              />
              <Input
                label="Website (optional)"
                placeholder="https://..."
                value={formData.website || ""}
                onChange={(e) =>
                  setFormData({ ...formData, website: e.target.value })
                }
              />
            </div>

            <Button
              className="w-full"
              disabled={!canProceedStep1}
              onClick={() => setStep(2)}
            >
              Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Vanity Mining */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-claw-400" />
              Mine Vanity Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <VanityMiner onFound={handleVanityFound} />

            {vanityKeypair && (
              <div className="mt-4 p-4 bg-dark-800 rounded-lg">
                <p className="text-sm text-dark-400 mb-1">Vanity Address Found:</p>
                <p className="font-mono text-claw-400 break-all">
                  {vanityKeypair.publicKey.toString()}
                </p>
              </div>
            )}

            <div className="flex gap-4 mt-6">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                className="flex-1"
                disabled={!canProceedStep2}
                onClick={() => setStep(3)}
              >
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review & Create */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Create</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-dark-800 rounded-lg">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt={formData.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-dark-700 rounded-lg flex items-center justify-center text-2xl font-bold text-dark-400">
                    {formData.symbol.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg">{formData.name}</h3>
                  <p className="text-dark-400">${formData.symbol}</p>
                </div>
              </div>

              <div className="p-4 bg-dark-800 rounded-lg">
                <p className="text-sm text-dark-400 mb-1">Token Address:</p>
                <p className="font-mono text-claw-400 text-sm break-all">
                  {vanityKeypair?.publicKey.toString()}
                </p>
              </div>

              <div className="p-4 bg-dark-800 rounded-lg">
                <p className="text-dark-200">{formData.description}</p>
              </div>

              <div className="p-4 bg-claw-500/10 border border-claw-500/20 rounded-lg">
                <h4 className="font-semibold text-claw-400 mb-2">
                  Launch Details
                </h4>
                <ul className="text-sm text-dark-300 space-y-1">
                  <li>- Total Supply: 1,000,000,000 tokens</li>
                  <li>- Initial Virtual Liquidity: 30 SOL</li>
                  <li>- Platform Fee: 1%</li>
                  <li>- Migration at ~$69K market cap</li>
                </ul>
              </div>

              {!connected && (
                <p className="text-center text-amber-400 text-sm">
                  Please connect your wallet to create a token
                </p>
              )}

              <div className="flex gap-4">
                <Button variant="secondary" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  disabled={!connected || isCreating}
                  loading={isCreating}
                  onClick={handleCreate}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Launch Token
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
