import os
import zipfile
import shutil
import subprocess
import tempfile
import tkinter as tk
from tkinter import filedialog, messagebox

DEFAULT_NAME = "delivet-distribuidora"
DEFAULT_EMAIL = "marketing@tanaporta.com"
DEFAULT_REPO = "https://github.com/Delivet-distribuidora/Catalogo.git"

def run_git(command, path=None):
    result = subprocess.run(
        command,
        cwd=path,
        shell=True,
        capture_output=True,
        text=True
    )
    return result.stdout + result.stderr

def setup_git():
    run_git(f'git config --global user.name "{DEFAULT_NAME}"')
    run_git(f'git config --global user.email "{DEFAULT_EMAIL}"')
    run_git("git config --global core.autocrlf true")

def extract_zip(zip_path):
    temp = tempfile.mkdtemp()
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(temp)
    return temp

def copy_files(src, dst):
    for root, dirs, files in os.walk(src):
        rel = os.path.relpath(root, src)
        target = os.path.join(dst, rel)
        os.makedirs(target, exist_ok=True)
        for file in files:
            shutil.copy2(
                os.path.join(root, file),
                os.path.join(target, file)
            )

def clone_or_reset_repo(repo_url):
    name = repo_url.split("/")[-1].replace(".git", "")
    path = os.path.join(os.getcwd(), name)

    if not os.path.exists(path):
        # Clonar do zero
        subprocess.run(f"git clone {repo_url}", shell=True)
    else:
        # Abortar qualquer rebase ou merge travado de execuções anteriores
        run_git("git rebase --abort", path)
        run_git("git merge --abort", path)

        # Buscar estado atual do remoto
        run_git("git fetch origin", path)

        # Forçar branch main local identica ao remoto (descarta divergencias)
        run_git("git checkout main", path)
        run_git("git reset --hard origin/main", path)

    return path

def escolher_zip():
    file = filedialog.askopenfilename(filetypes=[("ZIP", "*.zip")])
    zip_entry.delete(0, tk.END)
    zip_entry.insert(0, file)

def process():
    zip_path = zip_entry.get()
    repo_url = repo_entry.get()
    commit_msg = msg_entry.get()

    if not zip_path:
        messagebox.showerror("Erro", "Selecione um ZIP.")
        return

    log.insert(tk.END, "Configurando Git...\n")
    setup_git()

    log.insert(tk.END, "Clonando / atualizando repo...\n")
    repo_path = clone_or_reset_repo(repo_url)

    log.insert(tk.END, "Extraindo ZIP...\n")
    extracted = extract_zip(zip_path)

    log.insert(tk.END, "Copiando arquivos...\n")
    copy_files(extracted, repo_path)

    log.insert(tk.END, "git add...\n")
    log.insert(tk.END, run_git("git add -A", repo_path))

    log.insert(tk.END, "git commit...\n")
    log.insert(tk.END, run_git(f'git commit -m "{commit_msg}"', repo_path))

    log.insert(tk.END, "git push...\n")
    push_output = run_git("git push origin main", repo_path)
    log.insert(tk.END, push_output)

    if "rejected" in push_output or "error" in push_output:
        messagebox.showerror("Erro no Push", "O push falhou. Veja o log para detalhes.")
    else:
        messagebox.showinfo("Concluido", "Arquivos enviados para o GitHub!")

root = tk.Tk()
root.title("ZIP -> GitHub Uploader")
root.geometry("620x420")

tk.Label(root, text="Arquivo ZIP").pack()

zip_entry = tk.Entry(root, width=70)
zip_entry.pack()

tk.Button(root, text="Selecionar ZIP", command=escolher_zip).pack()

tk.Label(root, text="URL do Repositorio").pack()

repo_entry = tk.Entry(root, width=70)
repo_entry.pack()
repo_entry.insert(0, DEFAULT_REPO)

tk.Label(root, text="Mensagem do Commit").pack()

msg_entry = tk.Entry(root, width=70)
msg_entry.pack()

tk.Button(
    root,
    text="Enviar para GitHub",
    command=process,
    bg="green",
    fg="white"
).pack(pady=10)

log = tk.Text(root, height=12)
log.pack(fill="both", expand=True)

root.mainloop()
