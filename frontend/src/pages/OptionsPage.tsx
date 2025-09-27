import { Navigation } from "../components/Navigation";
import TokenMinter from "../components/TokenMinter";
import { useState } from "react";
import { useSmartContracts } from "../services/smartContracts";

const OptionsPage = () => {
  const [optionForm, setOptionForm] = useState({
    optionType: 0, // 0 = Call, 1 = Put
    strikePrice: "",
    expiryDays: "30",
    underlyingAsset: "",
    collateralToken: "",
    contractSize: "1",
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const [optionId, setOptionId] = useState("");

  const { createOption, purchaseOption } = useSmartContracts();

  const handleCreateOption = async () => {
    try {
      setCreating(true);
      setError("");
      setSuccess("");

      // Convert expiry days to timestamp
      const expiryTimestamp =
        Math.floor(Date.now() / 1000) +
        parseInt(optionForm.expiryDays) * 24 * 60 * 60;

      await createOption({
        optionType: optionForm.optionType,
        strikePrice: optionForm.strikePrice,
        expiryTimestamp,
        underlyingAsset: optionForm.underlyingAsset,
        collateralToken: optionForm.collateralToken,
        contractSize: optionForm.contractSize,
      });

      setSuccess("Option created successfully!");
      // Reset form
      setOptionForm({
        optionType: 0,
        strikePrice: "",
        expiryDays: "30",
        underlyingAsset: "",
        collateralToken: "",
        contractSize: "1",
      });
    } catch (err: any) {
      setError(err.message || "Failed to create option");
    } finally {
      setCreating(false);
    }
  };

  const handlePurchaseOption = async () => {
    try {
      setPurchasing(true);
      setError("");
      setSuccess("");

      await purchaseOption(optionId);
      setSuccess("Option purchased successfully!");
      setOptionId("");
    } catch (err: any) {
      setError(err.message || "Failed to purchase option");
    } finally {
      setPurchasing(false);
    }
  };
  return (
    <div
      className="h-screen w-screen overflow-auto"
      style={{
        background:
          "linear-gradient(180deg, var(--sky-blue) 0%, var(--light-green) 50%, var(--cream) 100%)",
      }}
    >
      {/* Game Menu Navigation */}
      <Navigation />

      {/* Main Content */}
      <div className="px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Page Title */}
          <div className="text-center mb-8">
            <h1
              className="text-4xl md:text-6xl mb-4"
              style={{ color: "var(--charcoal)" }}
            >
              OPTIONS TRADING
            </h1>
            <p className="text-xl" style={{ color: "var(--charcoal)" }}>
              Create and Trade Options on Citrea
            </p>
          </div>

          {/* Options Trading Sections */}
          <div className="space-y-8">
            {/* Token Minting Section */}
            <div className="game-card bg-white">
              <h2 className="text-xl font-bold mb-4" style={{ color: "var(--charcoal)", fontFamily: "'Press Start 2P', monospace" }}>
                Mint Mock Tokens
              </h2>
              <p className="mb-4" style={{ color: "var(--charcoal)" }}>Mint test tokens for options trading:</p>
              <TokenMinter />
            </div>

            <div className="game-card bg-white">
              <h2 className="text-xl font-bold mb-4" style={{ color: "var(--charcoal)", fontFamily: "'Press Start 2P', monospace" }}>
                Create New Option
              </h2>

              {error && (
                <div className="bg-red-100 border-2 border-red-400 rounded p-3 mb-4" style={{ color: "var(--warm-red)" }}>
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-100 border-2 border-green-400 rounded p-3 mb-4" style={{ color: "var(--light-green)" }}>
                  {success}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2 font-bold" style={{ color: "var(--charcoal)", fontFamily: "'Press Start 2P', monospace" }}>
                    Option Type
                  </label>
                  <select
                    className="pixel-input"
                    value={optionForm.optionType}
                    onChange={(e) =>
                      setOptionForm({
                        ...optionForm,
                        optionType: parseInt(e.target.value),
                      })
                    }
                  >
                    <option value={0}>Call Option</option>
                    <option value={1}>Put Option</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-2 font-bold" style={{ color: "var(--charcoal)", fontFamily: "'Press Start 2P', monospace" }}>
                    Strike Price
                  </label>
                  <input
                    type="number"
                    placeholder="Enter strike price"
                    className="pixel-input"
                    value={optionForm.strikePrice}
                    onChange={(e) =>
                      setOptionForm({
                        ...optionForm,
                        strikePrice: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 font-bold" style={{ color: "var(--charcoal)", fontFamily: "'Press Start 2P', monospace" }}>
                    Expiry (Days)
                  </label>
                  <input
                    type="number"
                    placeholder="Days until expiry"
                    className="pixel-input"
                    value={optionForm.expiryDays}
                    onChange={(e) =>
                      setOptionForm({
                        ...optionForm,
                        expiryDays: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 font-bold" style={{ color: "var(--charcoal)", fontFamily: "'Press Start 2P', monospace" }}>
                    Contract Size
                  </label>
                  <input
                    type="number"
                    placeholder="Contract size"
                    className="pixel-input"
                    value={optionForm.contractSize}
                    onChange={(e) =>
                      setOptionForm({
                        ...optionForm,
                        contractSize: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 font-bold" style={{ color: "var(--charcoal)", fontFamily: "'Press Start 2P', monospace" }}>
                    Underlying Asset
                  </label>
                  <input
                    type="text"
                    placeholder="Asset address"
                    className="pixel-input"
                    value={optionForm.underlyingAsset}
                    onChange={(e) =>
                      setOptionForm({
                        ...optionForm,
                        underlyingAsset: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 font-bold" style={{ color: "var(--charcoal)", fontFamily: "'Press Start 2P', monospace" }}>
                    Collateral Token
                  </label>
                  <input
                    type="text"
                    placeholder="Collateral token address"
                    className="pixel-input"
                    value={optionForm.collateralToken}
                    onChange={(e) =>
                      setOptionForm({
                        ...optionForm,
                        collateralToken: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <button
                onClick={handleCreateOption}
                disabled={creating}
                className="nintendo-button-primary w-full mt-4 disabled:opacity-50"
              >
                {creating ? "Creating Option..." : "Create Option"}
              </button>
            </div>

            <div className="game-card bg-white">
              <h2 className="text-xl font-bold mb-4" style={{ color: "var(--charcoal)", fontFamily: "'Press Start 2P', monospace" }}>
                Purchase Option
              </h2>
              <p className="mb-4" style={{ color: "var(--charcoal)" }}>
                Purchase existing options by paying premium:
              </p>

              <div className="mb-4">
                <label className="block text-sm mb-2 font-bold" style={{ color: "var(--charcoal)", fontFamily: "'Press Start 2P', monospace" }}>
                  Option ID
                </label>
                <input
                  type="text"
                  placeholder="Enter option ID to purchase"
                  className="pixel-input"
                  value={optionId}
                  onChange={(e) => setOptionId(e.target.value)}
                />
              </div>

              <button
                onClick={handlePurchaseOption}
                disabled={purchasing || !optionId}
                className="nintendo-button w-full disabled:opacity-50"
                style={{ 
                  background: purchasing || !optionId ? 'var(--light-gray)' : 'var(--light-green)',
                  color: 'var(--charcoal)'
                }}
              >
                {purchasing ? "Purchasing Option..." : "Purchase Option"}
              </button>

              <div className="mt-4 text-sm" style={{ color: "var(--charcoal)" }}>
                <p className="mb-1">
                  • Make sure you have sufficient collateral/stablecoin balance
                </p>
                <p className="mb-1">• Premium will be calculated automatically</p>
                <p>• Transaction will be sent to your connected wallet</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptionsPage;
