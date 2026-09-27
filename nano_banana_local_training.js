window.NB_LOCAL_TRAINING = {
  schema: 1,
  name: "Nano Banana Local Training Seed",
  description:
    "Base inicial de conhecimentos, exemplos e templates para o motor local do Nano Banana. Isto alimenta um sistema de recuperação/regras; não é um modelo neural.",

  examples: [
    {
      id: "greeting",
      intent: "greeting",
      patterns: [
        "oi",
        "ola",
        "olá",
        "e ai",
        "eai",
        "hey",
        "bom dia",
        "boa tarde",
        "boa noite"
      ],
      answer:
        "Oi! 🍌 Estou rodando localmente neste dispositivo, sem chave de API. Posso conversar, fazer cálculos, consultar o contexto salvo e gerar pequenos exemplos de código."
    },

    {
      id: "capabilities",
      intent: "capabilities",
      patterns: [
        "o que voce faz",
        "o que você faz",
        "o que consegue",
        "capacidades",
        "quem e voce",
        "quem é você"
      ],
      answer:
        "Sou o Nano Banana no modo local. Consigo responder tarefas simples, fazer contas, usar conhecimento que foi salvo localmente, consultar projetos/arquivos e gerar alguns exemplos de código."
    },

    {
      id: "offline",
      intent: "offline",
      patterns: [
        "sem internet",
        "offline",
        "sem api",
        "sem chave",
        "local",
        "funciona offline"
      ],
      answer:
        "O modo local não precisa chamar Gemini, GPT, Claude ou outro servidor. As respostas vêm do código e dos dados que estão neste dispositivo."
    },

    {
      id: "html",
      intent: "code_html",
      patterns: [
        "crie um botao html",
        "crie um botão html",
        "faca um botao em html",
        "faça um botão em html",
        "botao html"
      ],
      answer:
        `[ARQUIVO: botao.html]
\`\`\`html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Botão</title>
</head>
<body>
  <button id="meuBotao">Clique aqui</button>

  <script>
    document.getElementById('meuBotao').addEventListener('click', () => {
      alert('Olá!');
    });
  </script>
</body>
</html>
\`\`\``
    },

    {
      id: "js_function",
      intent: "code_js",
      patterns: [
        "crie uma funcao javascript",
        "crie uma função javascript",
        "funcao js para somar",
        "função js para somar",
        "codigo javascript simples"
      ],
      answer:
        `[ARQUIVO: exemplo.js]
\`\`\`javascript
function somar(a, b) {
  return Number(a) + Number(b);
}

console.log(somar(2, 3));
\`\`\``
    },

    {
      id: "python",
      intent: "code_python",
      patterns: [
        "crie uma funcao python",
        "crie uma função python",
        "codigo python simples",
        "código python simples"
      ],
      answer:
        `[ARQUIVO: exemplo.py]
\`\`\`python
def somar(a, b):
    return a + b

print(somar(2, 3))
\`\`\``
    },

    {
      id: "unity",
      intent: "code_unity",
      patterns: [
        "unity c# mover jogador",
        "unity mover player",
        "script c# unity movimento",
        "script para mover player"
      ],
      answer:
        `[ARQUIVO: SimplePlayerMovement.cs]
\`\`\`csharp
using UnityEngine;

public class SimplePlayerMovement : MonoBehaviour
{
    [SerializeField] private float speed = 5f;

    private void Update()
    {
        float x = Input.GetAxisRaw("Horizontal");
        float z = Input.GetAxisRaw("Vertical");

        Vector3 direction =
            new Vector3(x, 0f, z).normalized;

        transform.position +=
            direction * speed * Time.deltaTime;
    }
}
\`\`\``
    },

    {
      id: "json",
      intent: "format_json",
      patterns: [
        "o que e json",
        "o que é json",
        "me explica json",
        "json"
      ],
      answer:
        'JSON é um formato de texto usado para organizar dados em objetos e listas. Exemplo: `{"nome":"Banana","idade":2}`.'
    },

    {
      id: "local_memory",
      intent: "local_memory",
      patterns: [
        "memoria local",
        "memória local",
        "o que foi salvo",
        "o que voce lembra",
        "o que você lembra"
      ],
      answer:
        "Posso consultar a memória local, o histórico salvo e, quando você estiver em um projeto, os registros e arquivos que o aplicativo armazenou neste dispositivo."
    }
  ],

  facts: [
    {
      topic: "local_mode",
      text:
        "O modo Nano Banana Local funciona sem chave de API e pode operar sem internet para tarefas que dependem apenas do motor e dos dados locais."
    },

    {
      topic: "learning",
      text:
        "O motor local pode aprender entradas fornecidas pelo usuário e persistir essas entradas em localStorage do navegador."
    },

    {
      topic: "projects",
      text:
        "Projetos do Nano Banana podem conter memória estruturada, registros e arquivos versionados que ficam disponíveis localmente no aplicativo."
    },

    {
      topic: "limitations",
      text:
        "Sem um modelo de linguagem embarcado, o motor local não tem o conhecimento geral e a capacidade de raciocínio de um LLM grande."
    },

    {
      topic: "code_generation",
      text:
        "A base inicial inclui pequenos templates de HTML, JavaScript, Python e C# para tarefas previsíveis."
    }
  ],

  commands: [
    "aprenda: texto que deve ser lembrado",
    "memorize: texto que deve ser lembrado",
    "o que você aprendeu?",
    "apague o que você aprendeu: trecho"
  ]
};
