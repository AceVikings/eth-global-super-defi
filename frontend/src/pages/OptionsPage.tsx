import { WalletDropdown } from "../components/WalletDropdown";
import TokenMinter from "../components/TokenMinter";
import { useState } from "react";
import { useSmartContracts } from "../services/smartContracts";

interface OptionsPageProps {
  onNavigate: (page: string) => void;
}

const OptionsPage = ({ onNavigate }: OptionsPageProps) => {
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
      <nav className="game-menu sticky top-0 z-40">
        <div className="w-full flex justify-between items-center">
          <div className="menu-item" onClick={() => onNavigate("home")}>
            Home
          </div>

          <div className="flex">
            <div className="menu-item active">Options</div>
            <div className="menu-item" onClick={() => onNavigate("swap")}>
              Swap
            </div>
            <div className="menu-item" onClick={() => onNavigate("futures")}>
              Futures
            </div>
          </div>

          <div className="flex items-center">
            <WalletDropdown />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Page Title */}
          <div className="text-center mb-8">
            <h1
              className="text-4xl md:text-6xl mb-4"
              style={{ color: "var(--warm-red)" }}
            >
              ⚡ OPTIONS TRADING ⚡
            </h1>
            <p className="text-xl" style={{ color: "var(--charcoal)" }}>
              Create and Trade Options on Citrea
            </p>
          </div>

          {/* Options Trading Sections */}
          <div className="space-y-8">
            {/* Token Minting Section */}
            <div className="bg-blue-900 border-4 border-blue-600 rounded-lg p-6 text-white font-mono">
              <h2 className="text-yellow-400 text-xl font-bold mb-4">
                Mint Mock Tokens
              </h2>
              <p className="mb-4">Mint test tokens for options trading:</p>
              <TokenMinter />
            </div>

            <div className="bg-blue-900 border-4 border-blue-600 rounded-lg p-6 text-white font-mono">
              <h2 className="text-yellow-400 text-xl font-bold mb-4">
                Create New Option
              </h2>

              {error && (
                <div className="bg-red-600 border border-red-400 rounded p-2 mb-4">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-600 border border-green-400 rounded p-2 mb-4">
                  {success}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-yellow-400 text-sm mb-2">
                    Option Type
                  </label>
                  <select
                    className="w-full bg-blue-800 border border-blue-500 rounded p-2 text-white"
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
                  <label className="block text-yellow-400 text-sm mb-2">
                    Strike Price
                  </label>
                  <input
                    type="number"
                    placeholder="Enter strike price"
                    className="w-full bg-blue-800 border border-blue-500 rounded p-2 text-white"
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
                  <label className="block text-yellow-400 text-sm mb-2">
                    Expiry (Days)
                  </label>
                  <input
                    type="number"
                    placeholder="Days until expiry"
                    className="w-full bg-blue-800 border border-blue-500 rounded p-2 text-white"
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
                  <label className="block text-yellow-400 text-sm mb-2">
                    Contract Size
                  </label>
                  <input
                    type="number"
                    placeholder="Contract size"
                    className="w-full bg-blue-800 border border-blue-500 rounded p-2 text-white"
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
                  <label className="block text-yellow-400 text-sm mb-2">
                    Underlying Asset
                  </label>
                  <input
                    type="text"
                    placeholder="Asset address"
                    className="w-full bg-blue-800 border border-blue-500 rounded p-2 text-white"
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
                  <label className="block text-yellow-400 text-sm mb-2">
                    Collateral Token
                  </label>
                  <input
                    type="text"
                    placeholder="Collateral token address"
                    className="w-full bg-blue-800 border border-blue-500 rounded p-2 text-white"
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
                className="w-full mt-4 bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded disabled:opacity-50"
              >
                {creating ? "Creating Option..." : "Create Option"}
              </button>
            </div>

            <div className="bg-blue-900 border-4 border-blue-600 rounded-lg p-6 text-white font-mono">
              <h2 className="text-yellow-400 text-xl font-bold mb-4">
                Purchase Option
              </h2>
              <p className="mb-4">
                Purchase existing options by paying premium:
              </p>

              <div className="mb-4">
                <label className="block text-yellow-400 text-sm mb-2">
                  Option ID
                </label>
                <input
                  type="text"
                  placeholder="Enter option ID to purchase"
                  className="w-full bg-blue-800 border border-blue-500 rounded p-2 text-white"
                  value={optionId}
                  onChange={(e) => setOptionId(e.target.value)}
                />
              </div>

              <button
                onClick={handlePurchaseOption}
                disabled={purchasing || !optionId}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              >
                {purchasing ? "Purchasing Option..." : "Purchase Option"}
              </button>

              <div className="mt-4 text-sm text-gray-300">
                <p>
                  • Make sure you have sufficient collateral/stablecoin balance
                </p>
                <p>• Premium will be calculated automatically</p>
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
