import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleDollarSign,
  Moon,
  Plus,
  Receipt,
  Sun,
  Trash2,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import "./App.css";

const initialParticipants = [
  { id: 1, name: "Aryan", paid: 1500 },
  { id: 2, name: "Rahul", paid: 1000 },
  { id: 3, name: "Priya", paid: 500 },
  { id: 4, name: "Karan", paid: 0 },
];

function formatCurrency(amount) {
  return `₹${Math.abs(amount).toLocaleString("en-IN")}`;
}
function normalizeName(name) {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseAmount(value) {
  if (value === undefined || value === null) return null;

  const cleaned = String(value)
    .replace(/₹/g, "")
    .replace(/rs\.?/gi, "")
    .replace(/,/g, "")
    .trim();

  if (!cleaned || !/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return null;
  }

  const amount = Number(cleaned);

  return amount > 0 ? amount : null;
}

function processContributionImport(text) {
  const rows = text
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);

  const valid = [];
  const rejected = [];
  const duplicates = [];

  const seen = new Set();

  rows.forEach((row, index) => {
    const parts = row.split(",");

    if (parts.length < 2) {
      rejected.push({
        row: index + 1,
        value: row,
        reason: "Missing name or amount",
      });
      return;
    }

    const rawName = parts[0].trim();
    const rawAmount = parts.slice(1).join(",").trim();

    if (!rawName) {
      rejected.push({
        row: index + 1,
        value: row,
        reason: "Missing participant name",
      });
      return;
    }

    const amount = parseAmount(rawAmount);

    if (amount === null) {
      rejected.push({
        row: index + 1,
        value: row,
        reason: "Invalid amount",
      });
      return;
    }

    const name = normalizeName(rawName);
    const duplicateKey = `${name}|${amount}`;

    if (seen.has(duplicateKey)) {
      duplicates.push({
        row: index + 1,
        name,
        amount,
      });
      return;
    }

    seen.add(duplicateKey);

    valid.push({
      name,
      amount,
    });
  });

  const mergedMap = new Map();

  valid.forEach((entry) => {
    if (!mergedMap.has(entry.name)) {
      mergedMap.set(entry.name, {
        name: entry.name,
        amount: entry.amount,
        entries: 1,
      });
    } else {
      const existing = mergedMap.get(entry.name);

      existing.amount += entry.amount;
      existing.entries += 1;
    }
  });

  const merged = Array.from(mergedMap.values()).filter(
    (entry) => entry.entries > 1
  );

  return {
    valid: Array.from(mergedMap.values()),
    rejected,
    duplicates,
    merged,
    totalRows: rows.length,
  };
}
function calculateSettlements(participants, share) {
  const creditors = participants
    .map((person) => ({
      ...person,
      balance: person.paid - share,
    }))
    .filter((person) => person.balance > 0.01)
    .sort((a, b) => b.balance - a.balance);

  const debtors = participants
    .map((person) => ({
      ...person,
      balance: person.paid - share,
    }))
    .filter((person) => person.balance < -0.01)
    .map((person) => ({ ...person, balance: Math.abs(person.balance) }))
    .sort((a, b) => b.balance - a.balance);

  const settlements = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const amount = Math.min(debtor.balance, creditor.balance);

    settlements.push({
      from: debtor.name,
      to: creditor.name,
      amount,
    });

    debtor.balance -= amount;
    creditor.balance -= amount;

    if (debtor.balance < 0.01) i++;
    if (creditor.balance < 0.01) j++;
  }

  return settlements;
}

function App() {
  const savedPool = JSON.parse(localStorage.getItem("giftpool-data") || "null");

  const [theme, setTheme] = useState(
    () => localStorage.getItem("giftpool-theme") || "light"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("giftpool-theme", theme);
  }, [theme]);

  const toggleTheme = (event) => {
    const next = theme === "light" ? "dark" : "light";

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Fall back instantly if the browser can't animate the transition,
    // or the person has asked for reduced motion.
    if (!document.startViewTransition || prefersReducedMotion) {
      setTheme(next);
      return;
    }

    const x = event.clientX;
    const y = event.clientY;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = document.startViewTransition(() => setTheme(next));

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 600,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    });
  };

  const [poolName, setPoolName] = useState(
    savedPool?.poolName || "Manager Farewell Gift"
  );

  const [budget, setBudget] = useState(
    savedPool?.budget ?? 6000
  );

  const [participants, setParticipants] = useState(
    savedPool?.participants || initialParticipants
  );

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPayment, setNewPayment] = useState("");
  const [payments, setPayments] = useState(savedPool?.payments || []);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [paymentParticipant, setPaymentParticipant] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [importText, setImportText] = useState("");
  const [importResult, setImportResult] = useState(null);

  useEffect(() => {
    localStorage.setItem(
      "giftpool-data",
      JSON.stringify({
        poolName,
        budget,
        participants,
        payments,
      })
    );
  }, [poolName, budget, participants, payments]);

  const share = participants.length ? budget / participants.length : 0;

  const totalCollected = useMemo(
    () => participants.reduce((sum, person) => sum + Number(person.paid), 0),
    [participants]
  );

  const remaining = Math.max(budget - totalCollected, 0);
  const progress = budget ? Math.min((totalCollected / budget) * 100, 100) : 0;

  const settlements = useMemo(
    () => calculateSettlements(participants, share),
    [participants, share]
  );

  const addParticipant = (event) => {
    event.preventDefault();

    if (!newName.trim()) return;

    setParticipants((current) => [
      ...current,
      {
        id: Date.now(),
        name: newName.trim(),
        paid: Number(newPayment) || 0,
      },
    ]);

    setNewName("");
    setNewPayment("");
    setShowAdd(false);
  };


  const updatePayment = (id, value) => {
    setParticipants((current) =>
      current.map((person) =>
        person.id === id
          ? { ...person, paid: Math.max(0, Number(value) || 0) }
          : person
      )
    );
  };

  const removeParticipant = (id) => {
    setParticipants((current) =>
      current.filter((person) => person.id !== id)
    );
  };
  const addPayment = (participantId, amount) => {
    const participant = participants.find(
      (person) => person.id === participantId
    );

    if (!participant || amount <= 0) return;

    const payment = {
      id: Date.now(),
      name: participant.name,
      participantId,
      amount: Number(amount),
      date: new Date().toISOString().split("T")[0],
    };

    setPayments((current) => [...current, payment]);
  };
  const handleRecordPayment = (event) => {
    event.preventDefault();

    const amount = Number(paymentAmount);

    if (!paymentParticipant || amount <= 0) return;

    addPayment(Number(paymentParticipant), amount);

    setPaymentParticipant("");
    setPaymentAmount("");
    setShowPaymentModal(false);
  };
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">
            <CircleDollarSign size={22} />
          </div>
          <div>
            <h1>GiftPool</h1>
            <span>Simple group contributions</span>
          </div>
        </div>

        <div className="topbar-right">
          <div className="header-status">
            <span className="status-dot" />
            Pool is active
          </div>

          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={
              theme === "light" ? "Switch to dark mode" : "Switch to light mode"
            }
            title={
              theme === "light" ? "Switch to dark mode" : "Switch to light mode"
            }
          >
            <span className="theme-toggle-track">
              <span className="theme-toggle-thumb">
                {theme === "light" ? <Sun size={13} /> : <Moon size={13} />}
              </span>
            </span>
          </button>
        </div>
      </header>

      <main className="container">
        <section className="hero">
          <div>
            <span className="eyebrow">FAREWELL COLLECTION</span>
            <h2>{poolName}</h2>
            <p>
              Track everyone's contribution and settle the remaining balances
              fairly.
            </p>
          </div>

          <div className="budget-editor">
            <label>Pool budget</label>
            <div className="budget-input">
              <span>₹</span>
              <input
                type="number"
                min="0"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value) || 0)}
              />
            </div>
          </div>
        </section>

        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <WalletCards size={19} />
            </div>
            <span>Total budget</span>
            <strong>{formatCurrency(budget)}</strong>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">
              <Check size={19} />
            </div>
            <span>Collected</span>
            <strong>{formatCurrency(totalCollected)}</strong>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange">
              <CircleDollarSign size={19} />
            </div>
            <span>Still to collect</span>
            <strong>{formatCurrency(remaining)}</strong>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple">
              <Users size={19} />
            </div>
            <span>Participants</span>
            <strong>{participants.length}</strong>
          </div>
        </section>

        <section className="progress-card">
          <div className="progress-header">
            <div>
              <span className="section-label">COLLECTION PROGRESS</span>
              <h3>{Math.round(progress)}% collected</h3>
            </div>
            <span>
              {formatCurrency(totalCollected)} / {formatCurrency(budget)}
            </span>
          </div>

          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </section>

        <div className="content-grid">
          <section className="panel">
            <div className="panel-header">
              <div>
                <span className="section-label">CONTRIBUTORS</span>
                <h3>Who's contributing</h3>
              </div>

              <div className="panel-actions">
                <button
                  className="secondary-button"
                  onClick={() => setShowImportModal(true)}
                >
                  <Receipt size={17} />
                  Import contributions
                </button>

                <button
                  className="secondary-button"
                  onClick={() => setShowPaymentModal(true)}
                >
                  <Receipt size={17} />
                  Record payment
                </button>

                <button
                  className="primary-button"
                  onClick={() => setShowAdd((value) => !value)}
                >
                  <Plus size={17} />
                  Add person
                </button>
              </div>
            </div>

            {showAdd && (
              <form className="add-form" onSubmit={addParticipant}>
                <input
                  placeholder="Participant name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Amount paid"
                  value={newPayment}
                  onChange={(e) => setNewPayment(e.target.value)}
                />
                <button className="primary-button" type="submit">
                  Add
                </button>
              </form>
            )}

            <div className="participant-table">
              <div className="table-head">
                <span>Person</span>
                <span>Fair share</span>
                <span>Paid</span>
                <span>Balance</span>
                <span />
              </div>

              {participants.map((person) => {
                const balance = Number(person.paid) - share;
                const isOwed = balance < -0.01;
                const isCredit = balance > 0.01;

                return (
                  <div className="participant-row" key={person.id}>
                    <div className="person">
                      <div className="avatar">
                        {person.name.charAt(0).toUpperCase()}
                      </div>
                      <strong>{person.name}</strong>
                    </div>

                    <span>{formatCurrency(share)}</span>

                    <input
                      className="payment-input"
                      type="number"
                      min="0"
                      value={person.paid}
                      onChange={(e) =>
                        updatePayment(person.id, e.target.value)
                      }
                    />

                    <span
                      className={`balance ${isOwed ? "owe" : isCredit ? "credit" : "settled"
                        }`}
                    >
                      {isOwed
                        ? `Owes ${formatCurrency(balance)}`
                        : isCredit
                          ? `+${formatCurrency(balance)}`
                          : "Settled"}
                    </span>

                    <button
                      className="icon-button"
                      onClick={() => removeParticipant(person.id)}
                      title="Remove participant"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="panel settlement-panel">
            <div className="panel-header">
              <div>
                <span className="section-label">SETTLEMENT</span>
                <h3>Who pays whom</h3>
              </div>
              <div className="settlement-count">{settlements.length}</div>
            </div>

            {settlements.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <Check size={25} />
                </div>
                <strong>Everyone is settled</strong>
                <p>No payments are needed right now.</p>
              </div>
            ) : (
              <div className="settlement-list">
                {settlements.map((settlement, index) => (
                  <div className="settlement-item" key={index}>
                    <div className="settlement-person">
                      <div className="mini-avatar">
                        {settlement.from.charAt(0).toUpperCase()}
                      </div>
                      <strong>{settlement.from}</strong>
                    </div>

                    <ArrowRight size={17} className="arrow" />

                    <div className="settlement-person">
                      <div className="mini-avatar recipient">
                        {settlement.to.charAt(0).toUpperCase()}
                      </div>
                      <strong>{settlement.to}</strong>
                    </div>

                    <strong className="settlement-amount">
                      {formatCurrency(settlement.amount)}
                    </strong>
                  </div>
                ))}
              </div>
            )}

            <div className="share-note">
              <div>
                <span>Equal share per person</span>
                <strong>{formatCurrency(share)}</strong>
              </div>
              <ChevronDown size={17} />
            </div>
          </aside>
        </div>
      </main>

      {showPaymentModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowPaymentModal(false)}
        >
          <div
            className="payment-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="modal-eyebrow">PAYMENT HISTORY</span>
                <h3>Record payment</h3>
                <p>Record a contribution made by a participant.</p>
              </div>

              <button
                className="modal-close"
                onClick={() => setShowPaymentModal(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordPayment}>
              <div className="form-group">
                <label>Paid by</label>

                <select
                  value={paymentParticipant}
                  onChange={(event) =>
                    setPaymentParticipant(event.target.value)
                  }
                  required
                >
                  <option value="">Select participant</option>

                  {participants.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Amount</label>

                <div className="amount-input">
                  <span>₹</span>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Enter amount"
                    value={paymentAmount}
                    onChange={(event) =>
                      setPaymentAmount(event.target.value)
                    }
                    required
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowPaymentModal(false)}
                >
                  Cancel
                </button>

                <button type="submit" className="primary-button">
                  <Receipt size={16} />
                  Record payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowImportModal(false)}
        >
          <div
            className="payment-modal import-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="modal-eyebrow">IMPORT DATA</span>
                <h3>Import contributions</h3>
                <p>Paste rows of name, amount to add or update people at once.</p>
              </div>

              <button
                className="modal-close"
                onClick={() => setShowImportModal(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="form-group">
              <label>Paste contribution records</label>

              <textarea
                className="import-textarea"
                value={importText}
                onChange={(e) => {
                  setImportText(e.target.value);
                  setImportResult(null);
                }}
                placeholder={`Example:
Rahul, ₹1,500
rahul , 1500
PRIYA, 500
Karan, ₹1,000
Priya, 500
Unknown, abc`}
                rows={9}
              />

              <p className="form-hint">
                Use one contribution per line in the format: Name, Amount
              </p>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="cancel-button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportResult(null);
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  const result = processContributionImport(importText);
                  setImportResult(result);
                }}
              >
                <Receipt size={16} />
                Process import
              </button>
            </div>

            {importResult && (
              <div className="import-result">
                <div className="import-summary">
                  <div>
                    <strong>{importResult.valid.length}</strong>
                    <span>Imported</span>
                  </div>

                  <div>
                    <strong>{importResult.duplicates.length}</strong>
                    <span>Duplicates</span>
                  </div>

                  <div>
                    <strong>{importResult.merged.length}</strong>
                    <span>Merged</span>
                  </div>

                  <div>
                    <strong>{importResult.rejected.length}</strong>
                    <span>Rejected</span>
                  </div>
                </div>

                <p>Processed {importResult.totalRows} contribution rows.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
