# AI-Powered Retail Forecasting Engine (in-progress)
LA Tech Rising | Spring 2026 | Mentor: Ritesh Verma

A reusable retail forecasting engine that ingests historical sales data, forecasts future demand, flags unusual patterns, and generates plain-English summaries using the Gemini API.

## Team

| Role | Name | Primary Ownership |
|------|------|-------------------|
| Project Lead · Architecture & Infrastructure | Mira Bhakta | System design, model selection, testing suite, CI/CD, deployment, cross-role debugging |
| Co-Project Lead · Alerting Engine · Forecasting Co-Owner | James Ybarra | `models/alerter.py`, `models/forecaster.py` (co-owner) |
| Data Preparation & Schema Mapping · Dashboard Support | Andrew Garcia Leopold | `utils/processor.py` - schema mapping + derived fields |
| Data Preparation (Derived Fields) · AI Insights Support | Krisna Vega | `utils/trend.py` + derived fields in `processor.py` |
| Forecasting Engine · Alerting Co-Owner | Alberto Barboza | `models/forecaster.py`, `models/alerter.py` (co-owner) |
| AI Insights & Reporting · Dashboard Support | Sarah Abdeen | `utils/ai_summary.py` + AI Summary panel in `app.py` |
| Dashboard & Visualization · Integration Lead | Justin Hernandez | `app.py` — all views, sidebar, filters, layout, loading states |


## Tech Stack
- Python 3.9+
- Streamlit 1.32.0
- scikit-learn 1.4.1
- pandas / NumPy
- Gemini API (google-generativeai SDK)
- python-dotenv

## Setup

1. Clone the repository
   - git clone <repo-url>

2. Create and activate a virtual environment
   - python -m venv venv
   - source venv/bin/activate  // # Windows: venv\Scripts\activate

4. Install dependencies
   - pip install -r requirements.txt

5. Add your API key
   Create a .env file in the project root:
   - GEMINI_API_KEY=your_key_here

6. Run the app
   - streamlit run app.py


## Features
- Upload any retail sales CSV and get an analysis-ready dashboard
- Schema mapping and clean dataset export for downstream pipeline stages
- Demand forecasts for the next 1–3 months with model accuracy comparison
- Automated alert panel flagging anomalies, declining demand, and margin losses
- Plain-English AI summary generated on demand via the Gemini API
- Interactive filters by date range, category, store, and region

## Security
Never commit your .env file. It is excluded from version control via .gitignore.
If a key is accidentally exposed, revoke it immediately in the Gemini console 
and generate a new one.
