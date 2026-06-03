# CONTINUE.md
# Articóra Project Documentation
---
*This file provides essential details about the Articóra project, its architecture, workflows, tools, and conventions.*

---

---
## 1. **Project Overview**
**Purpose**
- A platform focused on document management, text search, and user collaboration.
- Core functionality includes:
  - Text ranking using **tf-idf algorithm** (implemented in `tf-idf/` folder)
  - User authentication and role management
  - Secure document uploads and real-time chat
  - Rich UI with dynamic front-end components
- TypeScript+Node.js backend, designed using the Express.js framework

**Technologies & Tools:**
- **Backend:** Node.js, Express.js, SQLite (or equivalent).
- **Frontend:** EJS templating, vanilla JavaScript for interactive logic.
- **Search Functionality:** `tf-idf` algorithm (Python implementation in `tf-idf/`).
- **Security:** Encrypted emails, secure upload handling, role-based access.
- **Chat/API:** Socket.io integration for real-time chat infrastructure.

---

---
## 2. **Getting Started**
### **Prerequisites**
- Node.js (version matching `package.json` `engines` field, if specified)
- Python 3.x (for `tf-idf` modules)
- SQLite3 CLI (or an SQLite browser if useful).
- EJS-aware templating environment (tested with Node.js express-ejs vars).

### **Setup & Installation**
1. Clone this repository.
2. Install dependencies:
   ```bash
   npm install
   pip install -r tf-idf/requirements.txt
   ```
3. Initialize the SQLite database:
   ```bash
   sqlite3 database/articora.db < database/init.sql
   ```

### **Run the Application**
- Start server:
  ```bash
   node server.js
   ```
- Run **tf-idf scripts** separately (in terminal):
  ```bash
   cd tf-idf && python recalc_idf.py
   ```
- Chat server (port `8080`):
  No specific socket enabling required: check `socketGets.js` in routes for relevant logic.

### **Run Tests**
- The project does not appear to include a test framework, but future contributions should use:
  - Unit Tests: `Jest` or `Mocha`
  - Backend Tests: Integration with `supertest` for HTTP flows

---

---
## 3. **Project Structure**
### **Directory Overview**
| Path                  | Description                                                                                     |
|-----------------------|-------------------------------------------------------------------------------------------------|
| `/public/`            | Assets (CSS, JS, images). Client files used in views.                                            |
| `/routes/`            | API & UI endpoints, segmented by module (e.g., `postRoutes`, `cedula.route`).                    |
| `/services/`          | Business/service logic (e.g., `sepService.js`).                                                 |
| `/middlewares/`       | Authentication, validation, and content middleware.                                              |
| `/tf-idf/`             | Core search infrastructure (**Python**): indexing, vector calculations.                          |
| `/lib/`              | Utility functions (e.g., `database.js`, `duplicate_checker.js`).                                   |
| `/diagrams/`         | Schema/region diagrams (entity-relationship, flowcharts).                                      |
| `/database/`         | Database migration scripts (`./init.sql`, backups).                                             |
| `/secure_storage/`   | Encrypted sensitive data storage.                                                              |

---

---
## 4. **Development Workflow**
### **Code Organization & Best Practices**
- **Naming Conventions:**
  - Use CamelCase for functions/modules (e.g., `reverseGeocode.camelCase`).
  - Primary imports (`uuid`, `express`) annotated in `server.js` (pattern to follow).
- **SQL**: Complex queries should reference `indexes.sql` and `Init.sql`.
- **Testing & Debugging:**
  - Log exceptions using `console.error({ error: err, stack: err.stack })`.
  - For `tf-idf` logic, Python debug logs can be reviewed in scripts `*.log`.

### **Workflow for Contributions**
- **Git Branching Strategy**: Not explicitly configured, but recommended:
  - Feature/*branch-name*
  - Bugfix/*description*
- **Database Migrations:** Align structural changes with `database/config_tables.sql`.
- **UI/UX:** Prefer templating with **EJS** and vanilla JS (no SPAs; tested as-is).

---

---
## 5. **Key Concepts**
### **Core Abstractions**
- **The IR-TFIDF Model**:
  - Text Edit Distance implemented in `database/populate_database.py` + `tf-idf/recalc_idf.py`.
- **UserPrivileges**: Mimicked via JWT signed security tokens; see middleware `auth.js`
- **Real-Time Chat**:
  - Handled via `socket-init.js` → integrates socket.io for event-circuit connectivity.
- **Data Integrity**:
  - CRUD operations on database abstracted in `database.js`, use `useModelGuid` or `verifyGuid` to prevent ID confusion in routes.

### **Framework Patterns**
- Middleware Passive Route Handling:
  - Route injection example: `app.use(generateBefore heavenlyparam { checkrole } route);` should precede route into app.
- Client-Side Modals: User-defined as per `views/partials/**`.js files containing priorities as JS context objects (e.g., `add-to-list.js`).

---

---
## 6. **Common Tasks**

### **Migrate Database Backups**
1. Manually clone encrypted DB:
   ```bash
   // Secure storage needs manual decryption:
   node decrypt-backup.js --file database/backups/articora-2026-05.db.enc
   ```
2. Restore decrypt output to `database/articora.db`

### **Update Chat System**
- Update `socket-listeners.js` if changes include event emissions.
- Rotate sockets (if needed) by editing `lib/connection/options` object.

### **Expand Components**
- Extend the search(tf-idf) module: Generate or inspect `preprocess`-like components for ingestion of new formats.

---

---
## 7. **Troubleshooting**
### **Known Issues**
- Python tf-idf service might timeout: Set `time.sleep` intervals from solutions.
- **Port Conflicts**: Default usage prioritizing port `3000`, verify in server.js if running multiple servers

### **Debugging Tips**
- Review logs in `console.error` calls.
- Use browser's **DevTools** (`F12`) network tab for JSON responses.

---

---
## 8. **References & External Docs**
- SQLite: [SQLite Reference Documentation](https://www.sqlite.org/docs.html)
- TypeScript (NodeJS): [libроме reвую إمكانностях\u2010デーキーナ](https://www.typescriptlang.org/docs/)
- Socket.io Framework: [Socket.io Developer Guide](https://socket.io/docs/)
- EJS Template Enhancements: Useful for shared snippets across files.
- Python Extensions: Reference [TF-IDF Wikipedia Page](https://en.wikipedia.org/wiki/Tf%E2%80%93idf) for implementation nuances.

---
---
## End of File Documentation

**Recomendaciones Adicionales:**
- Documentar los бугурлейты should map functions against mdcuкryption keys («secure_CHALLENGEルイセンチュ(proprietaryrg)）。
- Se recomienda ampliar los test de Python Θ us IT ON apex-t seien caso bearing especial relevancia MD5/HASH), aunque en pequeñas PRs podrían ser disparadas bajo un fines muestra sexo nomadel institución.

Fin del documento —---