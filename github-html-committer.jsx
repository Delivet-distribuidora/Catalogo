import { useState, useCallback, useRef } from "react";

const GITHUB_API = "https://api.github.com";

function toBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function fromBase64(str) {
  return decodeURIComponent(escape(atob(str)));
}

async function githubRequest(token, method, path, body) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "GitHub API error");
  return data;
}

const STEPS = ["config", "editor", "commit", "done"];

export default function App() {
  const [step, setStep] = useState("config");
  const [token, setToken] = useState("");
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("main");
  const [filePath, setFilePath] = useState("index.html");
  const [commitMsg, setCommitMsg] = useState("Update HTML via GitHub Committer");
  const [htmlContent, setHtmlContent] = useState(`<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Minha Página</title>\n  <style>\n    body { font-family: sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; }\n    h1 { color: #0d1117; }\n  </style>\n</head>\n<body>\n  <h1>Olá, GitHub! 🚀</h1>\n  <p>Esta página foi publicada com o GitHub HTML Committer.</p>\n</body>\n</html>`);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [commitUrl, setCommitUrl] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const editorRef = useRef(null);

  const validateConfig = useCallback(async () => {
    if (!token || !owner || !repo) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const user = await githubRequest(token, "GET", "/user");
      setUserInfo(user);
      await githubRequest(token, "GET", `/repos/${owner}/${repo}`);
      setStep("editor");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, owner, repo]);

  const doCommit = useCallback(async () => {
    if (!htmlContent.trim()) {
      setError("O conteúdo HTML não pode estar vazio.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      let sha = undefined;
      try {
        const existing = await githubRequest(
          token, "GET",
          `/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`
        );
        sha = existing.sha;
      } catch (_) {}

      const result = await githubRequest(
        token, "PUT",
        `/repos/${owner}/${repo}/contents/${filePath}`,
        {
          message: commitMsg,
          content: toBase64(htmlContent),
          branch,
          ...(sha ? { sha } : {}),
        }
      );

      setCommitUrl(result.commit?.html_url || `https://github.com/${owner}/${repo}`);
      setStep("done");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, owner, repo, branch, filePath, commitMsg, htmlContent]);

  const insertAtCursor = (text) => {
    const el = editorRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newVal = htmlContent.substring(0, start) + text + htmlContent.substring(end);
    setHtmlContent(newVal);
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = start + text.length;
      el.focus();
    }, 0);
  };

  const handleTabKey = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      insertAtCursor("  ");
    }
  };

  return (
    <div style={styles.root}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logo}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#e6edf3">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
            </svg>
            <span style={styles.logoText}>GitHub HTML Committer</span>
          </div>
          {userInfo && (
            <div style={styles.userBadge}>
              <img src={userInfo.avatar_url} alt="" style={styles.avatar} />
              <span style={styles.userName}>{userInfo.login}</span>
            </div>
          )}
        </div>
        <div style={styles.stepBar}>
          {[["config","⚙ Config"],["editor","✏ Editor"],["commit","🚀 Commit"],["done","✅ Pronto"]].map(([id, label], i) => {
            const idx = STEPS.indexOf(step);
            const thisIdx = STEPS.indexOf(id);
            return (
              <div key={id} style={{...styles.stepItem, ...(thisIdx === idx ? styles.stepActive : thisIdx < idx ? styles.stepDone : {})}}>
                {label}
              </div>
            );
          })}
        </div>
      </header>

      <main style={styles.main}>
        {/* STEP 1: CONFIG */}
        {step === "config" && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Configuração do Repositório</h2>
            <p style={styles.cardSub}>Conecte ao GitHub usando um Personal Access Token (PAT)</p>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Personal Access Token <span style={styles.req}>*</span></label>
              <input
                style={styles.input}
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={token}
                onChange={e => setToken(e.target.value)}
              />
              <span style={styles.hint}>
                <a href="https://github.com/settings/tokens/new?scopes=repo" target="_blank" rel="noreferrer" style={styles.link}>
                  Gerar token →
                </a> — precisa de escopo <code style={styles.code}>repo</code>
              </span>
            </div>

            <div style={styles.row}>
              <div style={{...styles.fieldGroup, flex:1}}>
                <label style={styles.label}>Owner (usuário/org) <span style={styles.req}>*</span></label>
                <input style={styles.input} placeholder="seu-usuario" value={owner} onChange={e => setOwner(e.target.value)} />
              </div>
              <div style={{...styles.fieldGroup, flex:1}}>
                <label style={styles.label}>Repositório <span style={styles.req}>*</span></label>
                <input style={styles.input} placeholder="meu-repo" value={repo} onChange={e => setRepo(e.target.value)} />
              </div>
            </div>

            <div style={styles.row}>
              <div style={{...styles.fieldGroup, flex:1}}>
                <label style={styles.label}>Branch</label>
                <input style={styles.input} placeholder="main" value={branch} onChange={e => setBranch(e.target.value)} />
              </div>
              <div style={{...styles.fieldGroup, flex:1}}>
                <label style={styles.label}>Caminho do arquivo</label>
                <input style={styles.input} placeholder="index.html" value={filePath} onChange={e => setFilePath(e.target.value)} />
              </div>
            </div>

            {error && <div style={styles.error}>{error}</div>}

            <button style={styles.btn} onClick={validateConfig} disabled={loading}>
              {loading ? <span style={styles.spinner} /> : null}
              {loading ? "Verificando..." : "Conectar ao GitHub →"}
            </button>
          </div>
        )}

        {/* STEP 2: EDITOR */}
        {step === "editor" && (
          <div style={styles.editorLayout}>
            <div style={styles.editorCard}>
              <div style={styles.editorHeader}>
                <div style={styles.editorTitle}>
                  <span style={styles.fileTag}>{owner}/{repo}</span>
                  <span style={styles.fileTag2}>{filePath}</span>
                </div>
                <div style={styles.editorActions}>
                  <button style={styles.btnSm} onClick={() => setPreviewMode(!previewMode)}>
                    {previewMode ? "📝 Código" : "👁 Preview"}
                  </button>
                </div>
              </div>

              <div style={styles.toolbar}>
                {[
                  ["<b></b>", "<strong>bold</strong>"],
                  ["<i></i>", "<em>italic</em>"],
                  ["<h1>", "<h1>Título</h1>"],
                  ["<p>", "<p>Parágrafo</p>"],
                  ["<a>", '<a href="#">Link</a>'],
                  ["<img>", '<img src="" alt="">'],
                  ["<div>", '<div class="">\n  \n</div>'],
                ].map(([label, snippet]) => (
                  <button key={label} style={styles.toolBtn} onClick={() => insertAtCursor(snippet)}>
                    {label}
                  </button>
                ))}
              </div>

              {previewMode ? (
                <iframe
                  srcDoc={htmlContent}
                  style={styles.preview}
                  title="preview"
                  sandbox="allow-scripts"
                />
              ) : (
                <textarea
                  ref={editorRef}
                  style={styles.textarea}
                  value={htmlContent}
                  onChange={e => setHtmlContent(e.target.value)}
                  onKeyDown={handleTabKey}
                  spellCheck={false}
                />
              )}

              <div style={styles.editorFooter}>
                <span style={styles.charCount}>{htmlContent.length} caracteres</span>
              </div>
            </div>

            <div style={styles.sidePanel}>
              <div style={styles.sideCard}>
                <h3 style={styles.sideTitle}>Commit</h3>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Mensagem</label>
                  <input
                    style={styles.input}
                    value={commitMsg}
                    onChange={e => setCommitMsg(e.target.value)}
                    placeholder="Descrição do commit"
                  />
                </div>
                <div style={styles.infoBox}>
                  <div style={styles.infoRow}><span>📁 Repo</span><span>{owner}/{repo}</span></div>
                  <div style={styles.infoRow}><span>🌿 Branch</span><span>{branch}</span></div>
                  <div style={styles.infoRow}><span>📄 Arquivo</span><span>{filePath}</span></div>
                </div>
                {error && <div style={styles.error}>{error}</div>}
                <button style={styles.btn} onClick={doCommit} disabled={loading}>
                  {loading ? <span style={styles.spinner} /> : null}
                  {loading ? "Commitando..." : "🚀 Fazer Commit"}
                </button>
                <button style={{...styles.btnOutline, marginTop: 8}} onClick={() => { setStep("config"); setError(""); }}>
                  ← Voltar
                </button>
              </div>

              <div style={styles.sideCard}>
                <h3 style={styles.sideTitle}>💡 Dicas</h3>
                <ul style={styles.tipList}>
                  <li>Use <kbd style={styles.kbd}>Tab</kbd> para indentar no editor</li>
                  <li>Clique em <strong>Preview</strong> para ver o resultado</li>
                  <li>O arquivo será criado ou atualizado automaticamente</li>
                  <li>Para GitHub Pages, use <code style={styles.code}>index.html</code> na raiz</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* STEP DONE */}
        {step === "done" && (
          <div style={{...styles.card, textAlign:"center"}}>
            <div style={styles.successIcon}>✅</div>
            <h2 style={styles.cardTitle}>Commit realizado com sucesso!</h2>
            <p style={styles.cardSub}>
              O arquivo <code style={styles.code}>{filePath}</code> foi publicado em{" "}
              <strong>{owner}/{repo}</strong> no branch <strong>{branch}</strong>.
            </p>
            <div style={styles.linkRow}>
              <a href={commitUrl} target="_blank" rel="noreferrer" style={styles.btnLink}>
                Ver commit no GitHub →
              </a>
              <a href={`https://${owner}.github.io/${repo}`} target="_blank" rel="noreferrer" style={styles.btnLink}>
                Abrir GitHub Pages →
              </a>
            </div>
            <div style={styles.row2}>
              <button style={styles.btn} onClick={() => setStep("editor")}>
                ✏ Editar novamente
              </button>
              <button style={styles.btnOutline} onClick={() => { setStep("config"); setError(""); setUserInfo(null); }}>
                🔄 Novo repositório
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    background: "#0d1117",
    color: "#e6edf3",
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
  },
  header: {
    background: "#161b22",
    borderBottom: "1px solid #30363d",
    padding: "0 24px",
  },
  headerInner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 0",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logoText: {
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: "-0.3px",
    color: "#e6edf3",
  },
  userBadge: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#21262d",
    borderRadius: 20,
    padding: "4px 12px 4px 6px",
    border: "1px solid #30363d",
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: "50%",
  },
  userName: {
    fontSize: 13,
    color: "#8b949e",
  },
  stepBar: {
    display: "flex",
    gap: 0,
    borderTop: "1px solid #21262d",
  },
  stepItem: {
    padding: "8px 20px",
    fontSize: 12,
    color: "#484f58",
    borderBottom: "2px solid transparent",
    transition: "all 0.2s",
  },
  stepActive: {
    color: "#58a6ff",
    borderBottom: "2px solid #58a6ff",
  },
  stepDone: {
    color: "#3fb950",
    borderBottom: "2px solid transparent",
  },
  main: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "32px 24px",
  },
  card: {
    background: "#161b22",
    border: "1px solid #30363d",
    borderRadius: 8,
    padding: 32,
    maxWidth: 640,
    margin: "0 auto",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 700,
    margin: "0 0 6px",
    color: "#e6edf3",
  },
  cardSub: {
    fontSize: 13,
    color: "#8b949e",
    margin: "0 0 28px",
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    display: "block",
    fontSize: 12,
    color: "#8b949e",
    marginBottom: 6,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  req: { color: "#f85149" },
  input: {
    width: "100%",
    background: "#0d1117",
    border: "1px solid #30363d",
    borderRadius: 6,
    padding: "8px 12px",
    color: "#e6edf3",
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  },
  hint: {
    display: "block",
    fontSize: 11,
    color: "#6e7681",
    marginTop: 5,
  },
  link: { color: "#58a6ff", textDecoration: "none" },
  code: {
    background: "#21262d",
    padding: "1px 6px",
    borderRadius: 4,
    fontSize: 12,
    color: "#f0883e",
    fontFamily: "inherit",
  },
  row: {
    display: "flex",
    gap: 16,
  },
  row2: {
    display: "flex",
    gap: 12,
    justifyContent: "center",
    marginTop: 20,
  },
  error: {
    background: "rgba(248,81,73,0.1)",
    border: "1px solid rgba(248,81,73,0.4)",
    borderRadius: 6,
    padding: "10px 14px",
    color: "#f85149",
    fontSize: 13,
    marginBottom: 16,
  },
  btn: {
    width: "100%",
    background: "#238636",
    color: "#fff",
    border: "1px solid #2ea043",
    borderRadius: 6,
    padding: "10px 20px",
    fontSize: 14,
    fontFamily: "inherit",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    transition: "background 0.15s",
  },
  btnOutline: {
    width: "100%",
    background: "transparent",
    color: "#8b949e",
    border: "1px solid #30363d",
    borderRadius: 6,
    padding: "9px 20px",
    fontSize: 14,
    fontFamily: "inherit",
    cursor: "pointer",
    transition: "background 0.15s",
  },
  btnSm: {
    background: "#21262d",
    color: "#e6edf3",
    border: "1px solid #30363d",
    borderRadius: 6,
    padding: "5px 12px",
    fontSize: 12,
    fontFamily: "inherit",
    cursor: "pointer",
  },
  btnLink: {
    display: "inline-block",
    background: "#21262d",
    color: "#58a6ff",
    border: "1px solid #30363d",
    borderRadius: 6,
    padding: "8px 16px",
    fontSize: 13,
    textDecoration: "none",
    fontFamily: "inherit",
  },
  spinner: {
    display: "inline-block",
    width: 14,
    height: 14,
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "spin 0.6s linear infinite",
  },
  editorLayout: {
    display: "grid",
    gridTemplateColumns: "1fr 300px",
    gap: 20,
    alignItems: "start",
  },
  editorCard: {
    background: "#161b22",
    border: "1px solid #30363d",
    borderRadius: 8,
    overflow: "hidden",
  },
  editorHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderBottom: "1px solid #21262d",
    background: "#161b22",
  },
  editorTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  fileTag: {
    fontSize: 12,
    color: "#8b949e",
    background: "#21262d",
    padding: "2px 8px",
    borderRadius: 4,
  },
  fileTag2: {
    fontSize: 12,
    color: "#58a6ff",
    background: "rgba(88,166,255,0.1)",
    padding: "2px 8px",
    borderRadius: 4,
  },
  editorActions: {
    display: "flex",
    gap: 8,
  },
  toolbar: {
    display: "flex",
    gap: 4,
    padding: "8px 12px",
    borderBottom: "1px solid #21262d",
    flexWrap: "wrap",
  },
  toolBtn: {
    background: "#21262d",
    color: "#e6edf3",
    border: "1px solid #30363d",
    borderRadius: 4,
    padding: "3px 10px",
    fontSize: 11,
    fontFamily: "inherit",
    cursor: "pointer",
  },
  textarea: {
    width: "100%",
    minHeight: 420,
    background: "#0d1117",
    color: "#e6edf3",
    border: "none",
    borderRadius: 0,
    padding: 16,
    fontSize: 13,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    lineHeight: 1.6,
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box",
    tabSize: 2,
  },
  preview: {
    width: "100%",
    minHeight: 420,
    border: "none",
    background: "#fff",
    display: "block",
  },
  editorFooter: {
    padding: "6px 16px",
    borderTop: "1px solid #21262d",
    display: "flex",
    justifyContent: "flex-end",
  },
  charCount: {
    fontSize: 11,
    color: "#484f58",
  },
  sidePanel: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  sideCard: {
    background: "#161b22",
    border: "1px solid #30363d",
    borderRadius: 8,
    padding: 20,
  },
  sideTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#e6edf3",
    margin: "0 0 16px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  infoBox: {
    background: "#0d1117",
    borderRadius: 6,
    padding: "10px 14px",
    marginBottom: 16,
    border: "1px solid #21262d",
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    color: "#8b949e",
    padding: "3px 0",
  },
  tipList: {
    margin: 0,
    padding: "0 0 0 16px",
    fontSize: 12,
    color: "#8b949e",
    lineHeight: 1.8,
  },
  kbd: {
    background: "#21262d",
    border: "1px solid #30363d",
    borderRadius: 3,
    padding: "1px 5px",
    fontSize: 11,
    fontFamily: "inherit",
    color: "#e6edf3",
  },
  successIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  linkRow: {
    display: "flex",
    gap: 12,
    justifyContent: "center",
    margin: "20px 0",
    flexWrap: "wrap",
  },
};
