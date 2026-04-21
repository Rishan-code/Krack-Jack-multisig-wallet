import { useState } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../context/Web3Context";
import { useToast } from "./Toast";

export default function SubmitForm({ onSubmit, isLoading }) {
  const { isOwner, isConnected } = useWeb3();
  const showToast = useToast();
  const [to, setTo] = useState("");
  const [value, setValue] = useState("0");
  const [data, setData] = useState("0x");
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!to || !ethers.isAddress(to)) {
      errs.to = "Invalid Ethereum address";
    }
    try {
      const val = parseFloat(value);
      if (isNaN(val) || val < 0) {
        errs.value = "Invalid ETH amount";
      }
    } catch {
      errs.value = "Invalid ETH amount";
    }
    if (data && data !== "0x" && !data.startsWith("0x")) {
      errs.data = "Must start with 0x";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await onSubmit(to, value, data || "0x");
      showToast("Transaction submitted successfully!", "success");
      setTo("");
      setValue("0");
      setData("0x");
      setErrors({});
    } catch (err) {
      showToast("Submit failed: " + (err.reason || err.message || "Unknown error"), "error");
    }
  };

  const disabled = !isConnected || !isOwner || isLoading;

  return (
    <section className="card submit-section" id="submit-section">
      <div className="card-header">
        <h2>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Submit New Transaction
        </h2>
      </div>
      <form className="submit-form" id="submit-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="input-to">Recipient Address</label>
          <input
            type="text"
            id="input-to"
            placeholder="0x..."
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={errors.to ? "input-error" : ""}
            autoComplete="off"
            disabled={disabled}
          />
          {errors.to && <span className="field-error">{errors.to}</span>}
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="input-value">Value (ETH)</label>
            <input
              type="text"
              id="input-value"
              placeholder="0.0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className={errors.value ? "input-error" : ""}
              disabled={disabled}
            />
            {errors.value && <span className="field-error">{errors.value}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="input-data">
              Calldata (hex)
              <span className="tooltip-wrapper">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span className="tooltip-text">
                  Leave as 0x for simple ETH transfers. Use ABI-encoded hex data to call smart contract functions.
                </span>
              </span>
            </label>
            <input
              type="text"
              id="input-data"
              placeholder="0x (empty for ETH transfer)"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className={errors.data ? "input-error" : ""}
              disabled={disabled}
            />
            {errors.data && <span className="field-error">{errors.data}</span>}
          </div>
        </div>
        <button
          type="submit"
          id="btn-submit-tx"
          className="btn btn-primary btn-full"
          disabled={disabled}
        >
          {isLoading ? (
            <>
              <span className="spinner" />
              Submitting...
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Submit Transaction
            </>
          )}
        </button>
        {!isOwner && isConnected && (
          <p className="form-note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Only wallet owners can submit transactions
          </p>
        )}
      </form>
    </section>
  );
}
