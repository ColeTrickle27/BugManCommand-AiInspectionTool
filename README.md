 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/README.md b/README.md
new file mode 100644
index 0000000000000000000000000000000000000000..b67d16df1288830ebe525e44152faa7fce7d76e6
--- /dev/null
+++ b/README.md
@@ -0,0 +1,79 @@
+# Holloman Exterminators Quoting Tool (Frontend V1)
+
+A responsive Vite + React + TypeScript quoting app designed for Holloman Exterminators in Dunn, NC.
+This app is built as a **quote/workflow layer** with **PestPac as the system of record**.
+
+## Features Included (Phase 1)
+
+- Dashboard with quote list, status tracking, search, and quick actions
+- Quote builder with:
+  - Customer info
+  - Quote details
+  - Scope summary
+  - Line items with optional add-ons, duplicate, delete, and reorder
+  - Discounts and deposit settings (flat or percentage)
+  - Terms and conditions block + custom terms
+  - Internal notes (hidden from customer preview)
+  - Attachment placeholders with customer visibility toggle-ready structure
+- Customer-facing quote preview screen
+- Internal work order view with PestPac-friendly copy block
+- Quote templates (13 default pest-control-focused templates)
+- Pricing/item library management
+- Settings screen (company profile, defaults, tax, terms)
+- LocalStorage persistence
+- Seed/demo data including sample quotes:
+  - Termite bait station
+  - Crawlspace encapsulation
+  - Bed bug treatment
+  - Quarterly pest control
+
+## Safety / Legal Placeholders
+
+V1 intentionally avoids chemical-specific promises and pesticide-label instructions.
+Includes placeholder language:
+- Treatment method to be confirmed by licensed applicator.
+- Materials and application methods must follow current product label and NC regulations.
+- Final scope subject to technician/sales review.
+
+## Install Dependencies
+
+```bash
+npm install
+```
+
+## Run Locally
+
+```bash
+npm run dev
+```
+
+Then open the local Vite URL shown in terminal.
+
+## Build
+
+```bash
+npm run build
+```
+
+## Deploy to Netlify
+
+1. Push repository to Git provider.
+2. Create a new Netlify site from repo.
+3. Use build settings:
+   - Build command: `npm run build`
+   - Publish directory: `dist/public`
+4. Deploy.
+
+`netlify.toml` is already present for this repo and can be adjusted if needed.
+
+## What Needs Backend/Database Later
+
+- Multi-user authentication and permissions
+- Cloud database and real record history
+- Audit logging
+- Customer approval portal with true signatures
+- Email/text sending for quote delivery and reminders
+- Direct PestPac API integration/import mapping
+- File storage for real attachments/photos
+- Reporting and analytics beyond local browser data
+
 
EOF
)
