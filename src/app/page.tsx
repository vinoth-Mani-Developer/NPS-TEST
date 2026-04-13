"use client";

import { useState, useMemo } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ClientInfo {
  name: string;
  age: number;
  mobile: string;
  email: string;
  pranNo: string;
  sector: "central" | "state" | "private" | "unorganised";
}

interface NPSInputs {
  startAge: number;
  retirementAge: number;
  currentMonthlyContribution: number;
  currentMonthlySalary: number;
  salaryIncrementPct: number;
  contributionIncrementPct: number;
  expectedReturn: number;
  annuityRate: number;
  annuityPurchasePercent: number;
  inflationRate: number;
}

interface YearlyRow {
  fy: string;
  monthlyContrib: number;
  totalContrib: number;
  salaryIncrement: number;
  monthlySalary: number;
  corpus: number;
}

interface NPSResult {
  rows: YearlyRow[];
  totalContribution: number;
  totalCorpus: number;
  annuityCorpus: number;
  lumpSum: number;
  monthlyPension: number;
  monthlyPensionReal: number;
  years: number;
}

// ─── Logic based on Excel structure ──────────────────────────────────────────
// Excel: Started at age 41, 20% salary & contribution increment per year
// FY 2025-26 → Monthly 2000, Salary 4500, total annual 24000
function calculateNPS(client: ClientInfo, inputs: NPSInputs): NPSResult {
  const {
    startAge,
    retirementAge,
    currentMonthlyContribution,
    currentMonthlySalary,
    salaryIncrementPct,
    contributionIncrementPct,
    expectedReturn,
    annuityRate,
    annuityPurchasePercent,
    inflationRate,
  } = inputs;

  const years = Math.max(1, retirementAge - startAge);
  const rows: YearlyRow[] = [];
  const startYear = new Date().getFullYear();
  let monthlySalary = currentMonthlySalary;
  let monthlyContrib = currentMonthlyContribution;
  let corpus = 0;
  const monthlyRate = expectedReturn / 100 / 12;

  for (let y = 0; y < years; y++) {
    const fyStart = startYear + y;
    const fy = `${fyStart}-${String(fyStart + 1).slice(2)}`;
    const totalContrib = monthlyContrib * 12;
    const salaryIncrement = y === 0 ? 0 : monthlySalary * (salaryIncrementPct / 100);

    // Grow existing corpus for 1 year + add monthly contributions
    corpus =
      corpus * Math.pow(1 + expectedReturn / 100, 1) +
      monthlyContrib * ((Math.pow(1 + monthlyRate, 12) - 1) / monthlyRate) * (1 + monthlyRate);

    rows.push({
      fy,
      monthlyContrib: Math.round(monthlyContrib),
      totalContrib: Math.round(totalContrib),
      salaryIncrement: Math.round(salaryIncrement),
      monthlySalary: Math.round(monthlySalary),
      corpus: Math.round(corpus),
    });

    monthlySalary = monthlySalary * (1 + salaryIncrementPct / 100);
    monthlyContrib = monthlyContrib * (1 + contributionIncrementPct / 100);
  }

  const totalContribution = rows.reduce((s, r) => s + r.totalContrib, 0);
  const totalCorpus = corpus;
  const annuityCorpus = totalCorpus * (annuityPurchasePercent / 100);
  const lumpSum = totalCorpus - annuityCorpus;
  const monthlyPension = (annuityCorpus * (annuityRate / 100)) / 12;
  const inflationFactor = Math.pow(1 + inflationRate / 100, years);
  const monthlyPensionReal = monthlyPension / inflationFactor;

  return {
    rows,
    totalContribution,
    totalCorpus,
    annuityCorpus,
    lumpSum,
    monthlyPension,
    monthlyPensionReal,
    years,
  };
}

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1_00_00_000
    ? `₹${(n / 1_00_00_000).toFixed(2)} Cr`
    : n >= 1_00_000
    ? `₹${(n / 1_00_000).toFixed(2)} L`
    : `₹${Math.round(n).toLocaleString("en-IN")}`;

const fmtINR = (n: number) =>
  `₹${Math.round(n).toLocaleString("en-IN")}`;

// ─── Text Input ───────────────────────────────────────────────────────────────
function TextInput({
  label, value, onChange, placeholder, type = "text", required = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <div className="field">
      <label className="field-label">
        {label}{required && <span className="req"> *</span>}
      </label>
      <input
        type={type}
        className="field-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

// ─── Select Input ─────────────────────────────────────────────────────────────
function SelectInput({
  label, value, onChange, options,
}: {
  label: string; value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <select className="field-input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Slider Input ─────────────────────────────────────────────────────────────
function SliderInput({
  label, value, min, max, step, unit, onChange, helper,
}: {
  label: string; value: number; min: number; max: number;
  step: number; unit: string; onChange: (v: number) => void; helper?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const display =
    unit === "₹" ? `₹${value.toLocaleString("en-IN")}` :
    unit === "%" ? `${value}%` : `${value} ${unit}`;
  return (
    <div className="field">
      <div className="field-row">
        <label className="field-label" style={{ margin: 0 }}>{label}</label>
        <span className="field-badge">{display}</span>
      </div>
      <div className="slider-track">
        <div className="slider-fill" style={{ width: `${pct}%` }} />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="slider"
        />
      </div>
      <div className="slider-bounds">
        <span>{unit === "₹" ? `₹${min.toLocaleString("en-IN")}` : `${min}${unit}`}</span>
        <span>{unit === "₹" ? `₹${max.toLocaleString("en-IN")}` : `${max}${unit}`}</span>
      </div>
      {helper && <p className="field-helper">{helper}</p>}
    </div>
  );
}

function SectionHead({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="sec-head">
      <div className="sec-icon">{icon}</div>
      <span className="sec-title">{title}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function NPSCalculatorPage() {
  const [client, setClient] = useState<ClientInfo>({
    name: "", age: 41, mobile: "", email: "", pranNo: "", sector: "central",
  });

  const [inputs, setInputs] = useState<NPSInputs>({
    startAge: 41,
    retirementAge: 60,
    currentMonthlyContribution: 2000,
    currentMonthlySalary: 4500,
    salaryIncrementPct: 20,
    contributionIncrementPct: 20,
    expectedReturn: 10,
    annuityRate: 6,
    annuityPurchasePercent: 40,
    inflationRate: 6,
  });

  const [showTable, setShowTable] = useState(false);
  const [activeSection, setActiveSection] = useState<"client" | "params" | "results">("client");

  const setC = (k: keyof ClientInfo) => (v: string | number) =>
    setClient((p) => ({ ...p, [k]: v }));
  const setI = (k: keyof NPSInputs) => (v: number) =>
    setInputs((p) => ({ ...p, [k]: v }));

  const result = useMemo(() => calculateNPS(client, inputs), [client, inputs]);

  const steps = [
    { id: "client" as const, label: "Client Info" },
    { id: "params" as const, label: "NPS Parameters" },
    { id: "results" as const, label: "Results" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --blue1: #0a2463;
          --blue2: #1a3a7c;
          --blue3: #2e5198;
          --blue4: #1565c0;
          --blue5: #1e88e5;
          --blue6: #42a5f5;
          --blue7: #90caf9;
          --blue8: #dce8f7;
          --blue9: #eef4fc;
          --white: #ffffff;
          --text: #0d2855;
          --muted: #4a6fa5;
          --border: #c5d9f0;
          --bg: #eef4fc;
          --card: #ffffff;
          --radius: 14px;
          --font-head: 'DM Serif Display', serif;
          --font-body: 'DM Sans', sans-serif;
          --green: #1b7a4e;
          --red: #c62828;
        }

        body { font-family: var(--font-body); background: var(--bg); color: var(--text); min-height: 100vh; }

        .topbar { background: var(--blue1); border-bottom: 3px solid var(--blue5); }
        .topbar-inner {
          max-width: 1140px; margin: 0 auto; padding: 0 24px;
          display: flex; align-items: center; min-height: 60px; gap: 14px;
        }
        .topbar-emblem {
          width: 40px; height: 40px; border-radius: 50%;
          background: linear-gradient(135deg, var(--blue5), var(--blue4));
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; flex-shrink: 0;
          box-shadow: 0 0 0 3px rgba(66,165,245,0.3);
        }
        .topbar-org-name { font-size: 16px; font-weight: 600; color: #f0f6ff; line-height: 1.2; }
        .topbar-org-name span { color: var(--blue7); }
        .topbar-org-sub { font-size: 10px; color: var(--blue7); text-transform: uppercase; letter-spacing: 0.1em; }

        .subheader { background: var(--white); border-bottom: 1px solid var(--border); box-shadow: 0 1px 4px rgba(10,36,99,0.06); }
        .subheader-inner {
          max-width: 1140px; margin: 0 auto; padding: 14px 24px;
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
        }
        .subheader-left { display: flex; align-items: center; gap: 12px; }
        .subheader-icon { width: 36px; height: 36px; background: rgba(21,101,192,0.1); border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
        .subheader-title { font-family: var(--font-head); font-size: 22px; color: var(--blue1); }
        .subheader-desc { font-size: 12px; color: var(--muted); margin-top: 2px; }
        .subheader-badge { background: rgba(21,101,192,0.08); border: 1px solid rgba(21,101,192,0.25); color: var(--blue4); font-size: 11px; font-weight: 600; padding: 4px 12px; border-radius: 100px; white-space: nowrap; }

        .step-nav { background: var(--white); border-bottom: 1px solid var(--border); }
        .step-nav-inner { max-width: 1140px; margin: 0 auto; padding: 0 24px; display: flex; }
        .step-btn { display: flex; align-items: center; gap: 8px; padding: 14px 20px; font-size: 13px; font-weight: 500; font-family: var(--font-body); border: none; background: transparent; cursor: pointer; color: var(--muted); border-bottom: 3px solid transparent; transition: all 0.15s; }
        .step-btn:hover { color: var(--blue4); }
        .step-btn--active { color: var(--blue4); border-bottom-color: var(--blue4); }
        .step-num { width: 22px; height: 22px; border-radius: 50%; background: var(--blue8); color: var(--blue3); font-size: 11px; font-weight: 600; display: flex; align-items: center; justify-content: center; }
        .step-btn--active .step-num { background: var(--blue4); color: white; }

        .main { max-width: 1140px; margin: 0 auto; padding: 28px 24px 60px; }

        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
        @media (max-width: 760px) { .two-col { grid-template-columns: 1fr; } }

        .card { background: var(--card); border-radius: var(--radius); border: 1px solid var(--border); overflow: hidden; }
        .card + .card { margin-top: 20px; }
        .card-body { padding: 20px 24px; }

        .sec-head { display: flex; align-items: center; gap: 10px; padding: 14px 20px; border-bottom: 1px solid var(--border); background: linear-gradient(90deg, rgba(21,101,192,0.04) 0%, transparent 100%); }
        .sec-icon { width: 30px; height: 30px; border-radius: 7px; background: rgba(21,101,192,0.1); display: flex; align-items: center; justify-content: center; font-size: 14px; }
        .sec-title { font-size: 14px; font-weight: 600; color: var(--blue1); }

        .field { margin-bottom: 16px; }
        .field:last-child { margin-bottom: 0; }
        .field-label { display: block; font-size: 12px; font-weight: 500; color: var(--text); margin-bottom: 6px; }
        .req { color: var(--red); }
        .field-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .field-badge { font-size: 12px; font-weight: 600; background: var(--blue8); color: var(--blue2); padding: 2px 10px; border-radius: 6px; }
        .field-input { width: 100%; padding: 9px 12px; font-size: 13px; font-family: var(--font-body); border: 1px solid var(--border); border-radius: 8px; background: var(--white); color: var(--text); outline: none; transition: border-color 0.15s; appearance: none; -webkit-appearance: none; }
        .field-input:focus { border-color: var(--blue5); box-shadow: 0 0 0 3px rgba(30,136,229,0.12); }
        .field-helper { font-size: 11px; color: #8aadd4; margin-top: 4px; line-height: 1.5; }

        .slider-track { position: relative; height: 6px; background: var(--blue8); border-radius: 99px; margin-bottom: 4px; }
        .slider-fill { position: absolute; left: 0; top: 0; bottom: 0; background: linear-gradient(90deg, var(--blue4), var(--blue6)); border-radius: 99px; pointer-events: none; }
        .slider { position: absolute; inset: 0; width: 100%; opacity: 0; cursor: pointer; height: 6px; -webkit-appearance: none; }
        .slider-bounds { display: flex; justify-content: space-between; font-size: 10px; color: #8aadd4; }

        .result-banner { background: linear-gradient(135deg, var(--blue1) 0%, var(--blue2) 100%); border-radius: 12px; padding: 22px; text-align: center; margin-bottom: 16px; }
        .result-banner-eyebrow { font-size: 10px; color: var(--blue7); text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 6px; }
        .result-banner-name { font-size: 13px; color: var(--blue7); margin-bottom: 8px; }
        .result-banner-value { font-family: var(--font-head); font-size: 38px; color: #fff; line-height: 1; margin-bottom: 4px; }
        .result-banner-sub { font-size: 12px; color: #8aadd4; }

        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px; }
        .stat-card { background: var(--bg); border-radius: 10px; padding: 14px 16px; border: 1px solid var(--border); }
        .stat-card--blue { background: var(--blue1); border-color: var(--blue2); }
        .stat-label { font-size: 10px; color: var(--muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
        .stat-card--blue .stat-label { color: var(--blue7); }
        .stat-value { font-size: 18px; font-weight: 600; color: var(--blue1); line-height: 1.2; font-family: var(--font-head); }
        .stat-card--blue .stat-value { color: #fff; }
        .stat-sub { font-size: 11px; color: #8aadd4; margin-top: 3px; }
        .stat-card--blue .stat-sub { color: var(--blue7); }

        .breakdown-row { display: flex; justify-content: space-between; align-items: center; padding: 9px 0; border-bottom: 1px dashed var(--border); font-size: 13px; }
        .breakdown-row:last-child { border-bottom: none; }
        .breakdown-label { color: var(--muted); }
        .breakdown-val { font-weight: 600; color: var(--text); }
        .breakdown-val--blue { color: var(--blue4); }
        .breakdown-val--green { color: var(--green); }

        .progress-wrap { margin-top: 16px; }
        .progress-row { display: flex; justify-content: space-between; font-size: 11px; color: var(--muted); margin-bottom: 5px; }
        .progress-track { height: 8px; background: var(--blue8); border-radius: 99px; overflow: hidden; }
        .progress-bar { height: 100%; border-radius: 99px; background: linear-gradient(90deg, var(--blue4), var(--blue6)); transition: width 0.5s; }

        .info-note { background: rgba(21,101,192,0.06); border: 1px solid rgba(21,101,192,0.2); border-radius: 8px; padding: 10px 14px; font-size: 12px; color: var(--blue4); margin-top: 14px; line-height: 1.6; }

        .table-toggle { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: var(--blue8); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; color: var(--blue2); margin-bottom: 16px; font-family: var(--font-body); width: 100%; transition: background 0.15s; }
        .table-toggle:hover { background: var(--border); }
        .table-wrap { overflow-x: auto; border-radius: 10px; border: 1px solid var(--border); }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        thead tr { background: var(--blue1); }
        thead th { padding: 10px 12px; text-align: right; font-weight: 600; color: #e8f0fe; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
        thead th:first-child { text-align: left; }
        tbody tr:nth-child(even) { background: var(--blue9); }
        tbody tr:hover { background: var(--blue8); }
        tbody td { padding: 9px 12px; color: var(--text); text-align: right; }
        tbody td:first-child { text-align: left; font-weight: 500; color: var(--blue2); }
        tfoot tr { background: var(--blue2); }
        tfoot td { padding: 10px 12px; font-weight: 700; color: #fff; text-align: right; font-size: 12px; }
        tfoot td:first-child { text-align: left; }

        .nav-row { display: flex; justify-content: space-between; align-items: center; margin-top: 24px; gap: 12px; }
        .btn { padding: 10px 24px; border-radius: 8px; font-size: 13px; font-weight: 600; font-family: var(--font-body); cursor: pointer; border: none; transition: all 0.15s; }
        .btn-primary { background: var(--blue4); color: white; }
        .btn-primary:hover { background: var(--blue2); }
        .btn-outline { background: white; color: var(--blue4); border: 1px solid var(--blue5); }
        .btn-outline:hover { background: var(--blue8); }
        .btn-print { background: var(--blue8); color: var(--blue2); border: 1px solid var(--border); }
        .btn-print:hover { background: var(--border); }

        .page-footer { text-align: center; padding: 20px 24px; font-size: 11px; color: #8aadd4; border-top: 1px solid var(--border); max-width: 1140px; margin: 0 auto; }

        @media (max-width: 560px) { .subheader-badge { display: none; } .step-btn { padding: 12px 10px; font-size: 12px; } }
        @media print { .step-nav, .nav-row, .table-toggle { display: none !important; } .card { break-inside: avoid; } }
      `}</style>

      {/* TOPBAR */}
      <div className="topbar">
        <div className="topbar-inner">
          <div className="topbar-emblem">🏛️</div>
          <div>
            <div className="topbar-org-name">Tamil Nadu <span>CSC e-Gov</span></div>
            <div className="topbar-org-sub">Common Service Centres · e-Governance Services</div>
          </div>
        </div>
      </div>

      {/* SUB-HEADER */}
      <div className="subheader">
        <div className="subheader-inner">
          <div className="subheader-left">
            <div className="subheader-icon">📊</div>
            <div>
              <div className="subheader-title">NPS Calculator</div>
              <div className="subheader-desc">National Pension System · Retirement Corpus Estimator</div>
            </div>
          </div>
          <div className="subheader-badge">PFRDA Regulated</div>
        </div>
      </div>

      {/* STEP NAV */}
      <div className="step-nav">
        <div className="step-nav-inner">
          {steps.map((s, i) => (
            <button
              key={s.id}
              className={`step-btn ${activeSection === s.id ? "step-btn--active" : ""}`}
              onClick={() => setActiveSection(s.id)}
            >
              <span className="step-num">{i + 1}</span>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="main">

        {/* ── STEP 1: CLIENT INFO ── */}
        {activeSection === "client" && (
          <>
            <div className="card">
              <SectionHead icon="👤" title="Client Information" />
              <div className="card-body">
                <div className="two-col">
                  <TextInput
                    label="Full Name of Client" value={client.name}
                    onChange={setC("name")} placeholder="e.g. Rajesh Kumar" required
                  />
                  <TextInput
                    label="Age of Client (years)" value={String(client.age)}
                    type="number" onChange={(v) => { setC("age")(Number(v)); setI("startAge")(Number(v)); }}
                    placeholder="e.g. 41" required
                  />
                  <TextInput
                    label="Mobile Number" value={client.mobile}
                    onChange={setC("mobile")} placeholder="e.g. 9876543210" type="tel"
                  />
                  <TextInput
                    label="Email Address" value={client.email}
                    onChange={setC("email")} placeholder="e.g. rajesh@email.com" type="email"
                  />
                  <TextInput
                    label="PRAN Number (if existing)" value={client.pranNo}
                    onChange={setC("pranNo")} placeholder="12-digit PRAN"
                  />
                  <SelectInput
                    label="Subscriber Sector" value={client.sector}
                    onChange={setC("sector")}
                    options={[
                      { value: "central", label: "Central Government Employee" },
                      { value: "state", label: "State Government Employee" },
                      { value: "private", label: "Corporate / Private Sector" },
                      { value: "unorganised", label: "Self-Employed / NPS Lite" },
                    ]}
                  />
                </div>
              </div>
            </div>
            <div className="nav-row">
              <div />
              <button className="btn btn-primary" onClick={() => setActiveSection("params")}>
                Next: NPS Parameters →
              </button>
            </div>
          </>
        )}

        {/* ── STEP 2: NPS PARAMETERS ── */}
        {activeSection === "params" && (
          <>
            <div className="two-col">
              <div>
                <div className="card">
                  <SectionHead icon="💰" title="Contribution & Salary" />
                  <div className="card-body">
                    <SliderInput
                      label="Current Monthly Contribution" value={inputs.currentMonthlyContribution}
                      min={500} max={100000} step={500} unit="₹"
                      onChange={setI("currentMonthlyContribution")}
                      helper="Employee share · Excel default: ₹2,000/month"
                    />
                    <SliderInput
                      label="Current Monthly Salary" value={inputs.currentMonthlySalary}
                      min={1000} max={500000} step={500} unit="₹"
                      onChange={setI("currentMonthlySalary")}
                      helper="Excel data: ₹4,500 at age 41"
                    />
                    <SliderInput
                      label="Annual Salary Increment %" value={inputs.salaryIncrementPct}
                      min={1} max={30} step={1} unit="%"
                      onChange={setI("salaryIncrementPct")}
                      helper="Excel data uses 20% increment per year"
                    />
                    <SliderInput
                      label="Annual Contribution Increment %" value={inputs.contributionIncrementPct}
                      min={1} max={30} step={1} unit="%"
                      onChange={setI("contributionIncrementPct")}
                      helper="Contribution grows in line with salary"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="card">
                  <SectionHead icon="📅" title="Age & Retirement" />
                  <div className="card-body">
                    <SliderInput
                      label="Age at NPS Start" value={inputs.startAge}
                      min={18} max={65} step={1} unit="yrs"
                      onChange={(v) => { setI("startAge")(v); setC("age")(v); if (inputs.retirementAge <= v) setI("retirementAge")(v + 1); }}
                    />
                    <SliderInput
                      label="Retirement Age" value={inputs.retirementAge}
                      min={Math.max(inputs.startAge + 1, 40)} max={75} step={1} unit="yrs"
                      onChange={setI("retirementAge")}
                      helper="NPS maturity from age 60. Premature exit after 5 years."
                    />
                  </div>
                </div>

                <div className="card">
                  <SectionHead icon="📈" title="Returns & Annuity" />
                  <div className="card-body">
                    <SliderInput
                      label="Expected Annual Return" value={inputs.expectedReturn}
                      min={6} max={15} step={0.5} unit="%"
                      onChange={setI("expectedReturn")}
                      helper="Historical NPS equity CAGR: 10–12%"
                    />
                    <SliderInput
                      label="Annuity Purchase %" value={inputs.annuityPurchasePercent}
                      min={40} max={100} step={5} unit="%"
                      onChange={setI("annuityPurchasePercent")}
                      helper="Minimum 40% must purchase annuity at exit"
                    />
                    <SliderInput
                      label="Expected Annuity Rate" value={inputs.annuityRate}
                      min={4} max={10} step={0.25} unit="%" onChange={setI("annuityRate")}
                    />
                    <SliderInput
                      label="Inflation Rate" value={inputs.inflationRate}
                      min={2} max={10} step={0.5} unit="%" onChange={setI("inflationRate")}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="nav-row">
              <button className="btn btn-outline" onClick={() => setActiveSection("client")}>← Back</button>
              <button className="btn btn-primary" onClick={() => setActiveSection("results")}>Calculate Results →</button>
            </div>
          </>
        )}

        {/* ── STEP 3: RESULTS ── */}
        {activeSection === "results" && (
          <>
            <div className="two-col">
              {/* Left: Main result */}
              <div>
                <div className="card">
                  <div className="card-body">
                    <div className="result-banner">
                      <div className="result-banner-eyebrow">Estimated Retirement Corpus</div>
                      {client.name && <div className="result-banner-name">{client.name}</div>}
                      <div className="result-banner-value">{fmt(result.totalCorpus)}</div>
                      <div className="result-banner-sub">in {result.years} years · Age {inputs.retirementAge}</div>
                    </div>

                    <div className="stats-grid">
                      <div className="stat-card stat-card--blue">
                        <div className="stat-label">Monthly Pension</div>
                        <div className="stat-value">{fmtINR(result.monthlyPension)}</div>
                        <div className="stat-sub">from annuity</div>
                      </div>
                      <div className="stat-card stat-card--blue">
                        <div className="stat-label">Lump Sum (tax-free)</div>
                        <div className="stat-value">{fmt(result.lumpSum)}</div>
                        <div className="stat-sub">{100 - inputs.annuityPurchasePercent}% of corpus</div>
                      </div>
                    </div>

                    <div className="breakdown-row">
                      <span className="breakdown-label">Total Amount Contributed</span>
                      <span className="breakdown-val">{fmt(result.totalContribution)}</span>
                    </div>
                    <div className="breakdown-row">
                      <span className="breakdown-label">Total Returns Earned</span>
                      <span className="breakdown-val breakdown-val--green">{fmt(result.totalCorpus - result.totalContribution)}</span>
                    </div>
                    <div className="breakdown-row">
                      <span className="breakdown-label">Annuity Corpus ({inputs.annuityPurchasePercent}%)</span>
                      <span className="breakdown-val breakdown-val--blue">{fmt(result.annuityCorpus)}</span>
                    </div>
                    <div className="breakdown-row">
                      <span className="breakdown-label">Monthly Pension (Today's ₹)</span>
                      <span className="breakdown-val breakdown-val--blue">{fmtINR(result.monthlyPensionReal)}</span>
                    </div>
                    <div className="breakdown-row">
                      <span className="breakdown-label">Investment Period</span>
                      <span className="breakdown-val">{result.years} Years</span>
                    </div>

                    <div className="progress-wrap">
                      <div className="progress-row">
                        <span>Contributed: {Math.round((result.totalContribution / result.totalCorpus) * 100)}%</span>
                        <span>Returns: {Math.round(((result.totalCorpus - result.totalContribution) / result.totalCorpus) * 100)}%</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-bar" style={{ width: `${Math.min(100, ((result.totalCorpus - result.totalContribution) / result.totalCorpus) * 100)}%` }} />
                      </div>
                    </div>

                    <div className="info-note">
                      💡 Lump-sum up to 60% is <strong>completely tax-free</strong> under Sec 10(12A). Annuity income is taxable as per income slab.
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Milestones + summary */}
              <div>
                <div className="card">
                  <SectionHead icon="🎯" title="Corpus Milestones" />
                  <div className="card-body">
                    {[5, 10, 15, result.years]
                      .filter((y, i, arr) => y > 0 && y <= result.years && arr.indexOf(y) === i)
                      .map((y) => {
                        const row = result.rows[Math.min(y - 1, result.rows.length - 1)];
                        return (
                          <div className="breakdown-row" key={y}>
                            <span className="breakdown-label">
                              {y === result.years ? "🏁 Retirement" : `Year ${y}`} · Age {inputs.startAge + y}
                            </span>
                            <span className="breakdown-val breakdown-val--blue">{row ? fmt(row.corpus) : "—"}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div className="card">
                  <SectionHead icon="📋" title="Client Summary" />
                  <div className="card-body">
                    {[
                      ["Name", client.name || "—"],
                      ["Age", `${client.age} years`],
                      ["PRAN No.", client.pranNo || "Not provided"],
                      ["Mobile", client.mobile || "—"],
                      ["Sector", { central: "Central Govt", state: "State Govt", private: "Corporate", unorganised: "Self-Employed" }[client.sector]],
                      ["Start Monthly Contribution", fmtINR(inputs.currentMonthlyContribution)],
                      ["Current Monthly Salary", fmtINR(inputs.currentMonthlySalary)],
                      ["Salary Increment p.a.", `${inputs.salaryIncrementPct}%`],
                      ["Expected Return p.a.", `${inputs.expectedReturn}%`],
                    ].map(([label, value]) => (
                      <div className="breakdown-row" key={label}>
                        <span className="breakdown-label">{label}</span>
                        <span className="breakdown-val">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Year-wise Table */}
            <div className="card" style={{ marginTop: 22 }}>
              <SectionHead icon="📑" title="Year-wise Contribution & Corpus Table" />
              <div className="card-body">
                <button className="table-toggle" onClick={() => setShowTable((v) => !v)}>
                  {showTable ? "▲ Hide" : "▼ Show"} year-wise breakdown ({result.rows.length} financial years)
                </button>
                {showTable && (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Financial Year</th>
                          <th>Monthly Contribution</th>
                          <th>Annual Contribution</th>
                          <th>Monthly Salary</th>
                          <th>Salary Increment</th>
                          <th>Corpus at Year End</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.rows.map((row) => (
                          <tr key={row.fy}>
                            <td>{row.fy}</td>
                            <td>{fmtINR(row.monthlyContrib)}</td>
                            <td>{fmtINR(row.totalContrib)}</td>
                            <td>{fmtINR(row.monthlySalary)}</td>
                            <td>{row.salaryIncrement > 0 ? fmtINR(row.salaryIncrement) : "—"}</td>
                            <td>{fmt(row.corpus)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td>TOTAL</td>
                          <td>—</td>
                          <td>{fmtINR(result.totalContribution)}</td>
                          <td>—</td>
                          <td>—</td>
                          <td>{fmt(result.totalCorpus)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="nav-row">
              <button className="btn btn-outline" onClick={() => setActiveSection("params")}>← Edit Parameters</button>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-print" onClick={() => window.print()}>🖨 Print / PDF</button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setActiveSection("client");
                    setClient({ name: "", age: 41, mobile: "", email: "", pranNo: "", sector: "central" });
                    setInputs({ startAge: 41, retirementAge: 60, currentMonthlyContribution: 2000, currentMonthlySalary: 4500, salaryIncrementPct: 20, contributionIncrementPct: 20, expectedReturn: 10, annuityRate: 6, annuityPurchasePercent: 40, inflationRate: 6 });
                  }}
                >
                  + New Calculation
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="page-footer">
        Tamil Nadu CSC e-Gov · NPS Calculator · For illustrative purposes only.
        Consult a PFRDA-registered advisor before investing. Not financial advice.
      </div>
    </>
  );
}
