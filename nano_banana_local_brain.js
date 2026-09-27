/* ============================================================
   NANO BANANA — CÉREBRO LOCAL v1
   ------------------------------------------------------------
   Sem API, sem CDN, sem internet.
   Este arquivo NÃO é um LLM treinado. É um motor local híbrido:
   recuperação de conhecimento + intenções + templates de código
   + memória aprendida pelo usuário + contexto do projeto.
   ============================================================ */
(function (global) {
  "use strict";

  const STORAGE = "nb_local_learned_v1";
  const MAX_LEARNED = 200;

  const TRAINING = global.NB_LOCAL_TRAINING || {
    examples: [],
    facts: []
  };

  const normalize = (value) => String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s._/-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  function loadLearned() {
    try {
      const v = JSON.parse(localStorage.getItem(STORAGE) || "[]");
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }

  function saveLearned(list) {
    const clean = Array.isArray(list) ? list.slice(-MAX_LEARNED) : [];
    localStorage.setItem(STORAGE, JSON.stringify(clean));
    return clean;
  }

  function learn(text) {
    const value = String(text || "").trim();
    if (!value) return false;
    const list = loadLearned();
    const n = normalize(value);

    if (!list.some(x => normalize(x) === n)) {
      saveLearned([...list, value]);
    }

    return true;
  }

  function forget(text) {
    const n = normalize(text);
    const list = loadLearned();

    saveLearned(
      list.filter(x => !normalize(x).includes(n))
    );
  }

  function keywordScore(query, target) {
    const q = normalize(query);
    const t = normalize(target);

    if (!q || !t) return 0;

    const qWords = [
      ...new Set(
        q.split(/\s+/).filter(w => w.length >= 2)
      )
    ];

    let score = 0;

    for (const w of qWords) {
      if (t.includes(w)) {
        score += w.length >= 5 ? 2 : 1;
      }
    }

    if (t.includes(q)) {
      score += 6;
    }

    return score;
  }

  function findBestExample(raw) {
    let best = null;
    let bestScore = 0;

    for (const item of (TRAINING.examples || [])) {
      for (const p of (item.patterns || [])) {
        const score = keywordScore(raw, p);

        if (score > bestScore) {
          bestScore = score;
          best = item;
        }
      }
    }

    return bestScore >= 2 ? best : null;
  }

  function learnedAnswer(raw) {
    const list = loadLearned();

    let best = "";
    let score = 0;

    for (const item of list) {
      const s = keywordScore(raw, item);

      if (s > score) {
        score = s;
        best = item;
      }
    }

    return score >= 4 ? best : "";
  }

  function math(raw) {
    const cleaned = String(raw)
      .replace(
        /^(quanto e|quanto é|calcule|calcula|resultado de)\s+/i,
        ""
      )
      .replace(/,/g, ".")
      .replace(/[^0-9+\-*/().%\s]/g, "")
      .trim();

    if (
      !cleaned ||
      cleaned.length > 120 ||
      !/^[0-9+\-*/().%\s]+$/.test(cleaned)
    ) {
      return null;
    }

    const expression = cleaned.replace(/%/g, "/100");

    try {
      const value = Function(
        "\"use strict\"; return (" + expression + ")"
      )();

      if (!Number.isFinite(value)) {
        return null;
      }

      return String(value);
    } catch {
      return null;
    }
  }

  function recentHistory(messages) {
    const list = Array.isArray(messages)
      ? messages
      : [];

    return list.slice(-8).map(x => ({
      role: x?.role || "",
      content: String(x?.content || "")
    }));
  }

  function projectContext() {
    const bits = [];

    try {
      if (typeof global.projectKnowledgeBlock === "function") {
        const v = global
          .projectKnowledgeBlock("")
          .replace(/\s+/g, " ")
          .trim();

        if (v) {
          bits.push(v.slice(0, 1800));
        }
      }
    } catch {}

    try {
      if (typeof global.exactFileContext === "function") {
        const v = global
          .exactFileContext("")
          .replace(/\s+/g, " ")
          .trim();

        if (v) {
          bits.push(v.slice(0, 1800));
        }
      }
    } catch {}

    return bits.join("\n");
  }

  function fileLookup(raw) {
    if (typeof global.findProjectFile !== "function") {
      return "";
    }

    const match = String(raw).match(
      /(?:arquivo|file)\s+[`"'“”]?([\w./\\-]+)[`"'“”]?/i
    );

    const name = match?.[1];

    if (!name) {
      return "";
    }

    try {
      const file = global.findProjectFile(
        name,
        global.currentChatId
      );

      if (!file) {
        return "";
      }

      const versions = Array.isArray(file.versions)
        ? file.versions
        : [];

      const original = versions.find(v => v.original);

      return (
        `Encontrei o arquivo **${name}** no projeto. ` +
        `Ele tem ${versions.length || 1} versão(ões).` +
        (
          original
            ? " A versão ORIGINAL está preservada localmente."
            : ""
        )
      );
    } catch {
      return "";
    }
  }

  function learnCommand(raw) {
    const m = String(raw).match(
      /^\s*(?:aprenda|memorize|lembre que|salve que)\s*[:\-]?\s*(.+)$/i
    );

    return m ? m[1].trim() : "";
  }

  function forgetCommand(raw) {
    const m = String(raw).match(
      /^\s*(?:apague o que voce aprendeu|apague o que você aprendeu|esqueca|esqueça)\s*[:\-]?\s*(.*)$/i
    );

    return m ? m[1].trim() : null;
  }

  function listLearned() {
    const list = loadLearned();

    if (!list.length) {
      return "Ainda não aprendi nada novo nesta instalação. Use “aprenda: ...” para adicionar conhecimento local.";
    }

    return (
      "O que já aprendi localmente:\n" +
      list
        .slice(-30)
        .map((x, i) => `${i + 1}. ${x}`)
        .join("\n")
    );
  }

  function codeFallback(raw) {
    const q = normalize(raw);

    if (
      /html/.test(q) &&
      /(pagina|site|arquivo|codigo|codigo)/.test(q)
    ) {
      return `[ARQUIVO: pagina.html]
\`\`\`html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Minha página</title>
</head>
<body>
  <h1>Olá!</h1>
</body>
</html>
\`\`\``;
    }

    if (
      /(javascript|js)/.test(q) &&
      /(funcao|função|codigo|código|exemplo)/.test(q)
    ) {
      return `[ARQUIVO: exemplo.js]
\`\`\`javascript
function saudar(nome) {
  return \`Olá, \${nome}!\`;
}

console.log(saudar("mundo"));
\`\`\``;
    }

    if (
      /python/.test(q) &&
      /(funcao|função|codigo|código|exemplo)/.test(q)
    ) {
      return `[ARQUIVO: exemplo.py]
\`\`\`python
def saudar(nome):
    return f"Olá, {nome}"

print(saudar("mundo"))
\`\`\``;
    }

    if (
      /(unity|c#|csharp)/.test(q) &&
      /(player|jogador|movimento|script|codigo|código)/.test(q)
    ) {
      return `[ARQUIVO: SimplePlayerMovement.cs]
\`\`\`csharp
using UnityEngine;

public class SimplePlayerMovement : MonoBehaviour
{
    [SerializeField] private float speed = 5f;

    private void Update()
    {
        float x = Input.GetAxisRaw("Horizontal");
        float z = Input.GetAxisRaw("Vertical");

        Vector3 direction = new Vector3(x, 0, z).normalized;
        transform.position += direction * speed * Time.deltaTime;
    }
}
\`\`\``;
    }

    return "";
  }

  function respond(messages) {
    const turns = recentHistory(messages);

    const raw =
      turns
        .filter(x => x.role === "user")
        .slice(-1)[0]?.content || "";

    const q = normalize(raw);

    const project =
      typeof global.isCurrentChatProject !== "undefined" &&
      !!global.isCurrentChatProject;

    if (!q) {
      return "Tô aqui 🍌. Pode falar comigo — estou no modo local, sem API.";
    }

    const learnText = learnCommand(raw);

    if (learnText) {
      learn(learnText);

      return "Aprendi e salvei isso localmente neste dispositivo. 🍌";
    }

    const forgotten = forgetCommand(raw);

    if (forgotten !== null) {
      if (!forgotten) {
        saveLearned([]);

        return "Apaguei tudo o que eu tinha aprendido localmente.";
      }

      forget(forgotten);

      return "Apaguei as entradas locais que combinavam com esse trecho.";
    }

    if (
      /o que (voce|você) aprendeu|o que ja aprendeu|o que já aprendeu|listar aprendizados/.test(q)
    ) {
      return listLearned();
    }

    const best = findBestExample(raw);

    if (best?.answer) {
      return best.answer;
    }

    const learned = learnedAnswer(raw);

    if (learned) {
      return (
        `Tenho este conhecimento salvo localmente que parece relacionado:\n\n` +
        `**${learned}**`
      );
    }

    const file = fileLookup(raw);

    if (file) {
      return file;
    }

    const result = math(raw);

    if (result !== null) {
      return `O resultado é **${result}**.`;
    }

    if (
      /que horas|data de hoje|qual a data|hoje/.test(q)
    ) {
      const now = new Date();

      return (
        `No dispositivo, agora é ` +
        `${now.toLocaleDateString("pt-BR")} ` +
        `${now.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit"
        })}.`
      );
    }

    const code = codeFallback(raw);

    if (code) {
      return code;
    }

    if (
      project &&
      /projeto|memoria|memória|arquivo|arquivos|script|scripts|bug|progresso/.test(q)
    ) {
      const ctx = projectContext();

      if (ctx) {
        return (
          `Estou usando o contexto local deste projeto. ` +
          `Encontrei informações salvas no dispositivo:\n\n` +
          `${ctx.slice(0, 1600)}`
        );
      }

      return (
        "Estou no modo local deste projeto. " +
        "Os arquivos e registros salvos podem ser consultados no aplicativo, " +
        "mas eu não tenho conhecimento geral de um LLM remoto."
      );
    }

    if (
      /ajuda|help|comando|configuracao|configuração/.test(q)
    ) {
      return (
        "No modo local eu consigo conversar, calcular, " +
        "consultar memória/projetos, aprender fatos que você mandar " +
        "e gerar pequenos templates de HTML, JavaScript, Python e C#. " +
        "Use “aprenda: ...” para adicionar conhecimento local."
      );
    }

    return (
      `Entendi: “${String(raw).slice(0, 180)}”. 🍌\n\n` +
      "Estou no cérebro local, então só consigo responder bem " +
      "quando a tarefa está na minha base, nas regras, nos templates " +
      "ou nos dados salvos neste dispositivo. " +
      "Você também pode me ensinar com “aprenda: ...”."
    );
  }

  global.NanoBananaLocalBrain = {
    version: "1.0.0",
    storageKey: STORAGE,
    training: TRAINING,
    loadLearned,
    saveLearned,
    learn,
    forget,
    respond
  };

})(window);
