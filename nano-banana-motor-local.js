/* =========================================================================
   NANO BANANA OFICIAL — MOTOR LOCAL (sem API, sem chave, 100% no dispositivo)
   -------------------------------------------------------------------------
   Esse arquivo cuida da parte "de código": matemática, sorteio (moeda/dado/
   número aleatório), texto (contar/inverter/maiúsculo/minúsculo), datas
   (dia da semana / quantos dias faltam) e a busca de arquivo do projeto.
   Pra respostas de conversa (saudação, ajuda, piada etc.) ele usa a lista
   de treinamento em window.NANO_LOCAL_TREINAMENTO — arquivo
   nano-banana-treinamento.js, que precisa ser carregado ANTES deste.

   nanoLocalRespond(messages) é o ponto de entrada. É ela que o preview.html
   já chama lá dentro do callAI() quando o provedor ativo é 'nano_local'
   (isso já está plugado no app, não precisa mexer em mais nada lá).
   ========================================================================= */

function nanoLocalNormalize(v){
  return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
}
function nanoLocalLastUser(messages){
  const a=(messages||[]).filter(x=>x&&x.role==='user');
  const x=a[a.length-1];
  return typeof x?.content==='string'?x.content:'';
}

/* ---------- matemática segura (só dígito/operador passa pro eval) ---------- */
function nanoLocalSafeMath(text){
  const t=String(text).replace(/,/g,'.').replace(/[^0-9+\-*/().%\s]/g,'').trim();
  if(!t||!/^[0-9+\-*/().%\s]+$/.test(t)||t.length>100)return null;
  try{const v=Function('"use strict";return ('+t.replace(/%/g,'/100')+')')(); return Number.isFinite(v)?String(v):null;}catch{return null;}
}
function nanoLocalMatematica(raw, q){
  // Checa o gatilho no texto NORMALIZADO (sem acento) — "quanto é" só bate aqui porque "é"
  // já virou "e". Testar isso direto no "raw" (com acento) era o bug: o regex sem acento
  // nunca batia com o texto acentuado, e a conta parava de funcionar.
  const temGatilho = /^(quanto e|quanto da|calcule|calcula|resultado de|qual (?:e|eh) o resultado de)\b/.test(q);
  const soExpressao = /^[\d+\-*/().%,\s]+$/.test(raw.trim()); // mensagem inteira já é só números/operadores
  // Sem gatilho explícito e sem ser uma expressão pura, não arrisca — evita que um número
  // solto no meio de outra frase (ex: "role um dado de 20 lados", data "25/12/2026", "17 é
  // primo") seja lido como conta de matemática. nanoLocalSafeMath já limpa letras sozinho,
  // então nem precisa tirar o prefixo antes de mandar pra ele.
  if(!temGatilho && !soExpressao) return '';
  const resultado = nanoLocalSafeMath(raw);
  return resultado ? `O resultado é **${resultado}**.` : '';
}

/* ---------- moeda / dado ---------- */
function nanoLocalMoedaDado(q){
  if(/cara ou coroa|jog(?:ar|a|ue) (?:uma )?moeda|moeda ao ar/.test(q)){
    return `**${Math.random()<0.5?'Cara':'Coroa'}** 🪙`;
  }
  const dm = q.match(/d(?:ado)?\s*(?:de\s*)?(\d{1,3})\s*(?:lados|faces)?/) || q.match(/\bd(\d{1,3})\b/);
  if(/\bdado\b|role um dado|rola(?:r)? um dado/.test(q) || dm){
    const lados = dm ? parseInt(dm[1],10) : 6;
    if(lados>=2 && lados<=1000){
      const resultado = 1 + Math.floor(Math.random()*lados);
      return `Rolei um dado de **${lados}** lados: deu **${resultado}**. 🎲`;
    }
  }
  return '';
}

/* ---------- número aleatório num intervalo ---------- */
function nanoLocalNumeroAleatorio(q){
  const m = q.match(/(?:numero aleatorio|sorte(?:ia|ar|io))[^\d-]*(-?\d+)[^\d-]+(-?\d+)/);
  if(!m) return '';
  let a=parseInt(m[1],10), b=parseInt(m[2],10);
  if(a>b) [a,b]=[b,a];
  if(b-a>1e9) return 'Esse intervalo é grande demais pra sortear localmente.';
  const r = a + Math.floor(Math.random()*(b-a+1));
  return `Número sorteado entre **${a}** e **${b}**: **${r}**`;
}

/* ---------- par/ímpar e número primo ---------- */
function nanoLocalEhPrimo(n){
  if(n<2) return false;
  if(n%2===0) return n===2;
  for(let i=3;i*i<=n;i+=2) if(n%i===0) return false;
  return true;
}
function nanoLocalParidadePrimo(raw, q){
  if(/par ou impar|impar ou par/.test(q)){
    const nm = raw.match(/-?\d+/);
    if(nm){ const n=parseInt(nm[0],10); return `**${n}** é **${n%2===0?'par':'ímpar'}**.`; }
  }
  // "primo" também é "cousin" em português — só interpreta como número primo se vier
  // colado a um dígito (ex: "17 e primo") ou junto da palavra "numero", nunca sozinho.
  if(/numero primo|\d\s*e\s*primo|\d\s*eh\s*primo|primo\?/.test(q)){
    const nm = raw.match(/-?\d+/);
    if(nm){
      const n = Math.abs(parseInt(nm[0],10));
      if(n>1e12) return 'Número grande demais pra verificar localmente.';
      return `**${n}** ${nanoLocalEhPrimo(n)?'é':'não é'} primo.`;
    }
  }
  return '';
}

/* ---------- utilidades de texto ---------- */
function nanoLocalLimparAlvo(s){
  return String(s||'').trim().replace(/^["'“”]+|["'“”.,!?]+$/g,'').trim();
}
function nanoLocalTextoUtil(raw){
  let m;
  if((m = raw.match(/quantas letras (?:tem|possui) (.+)/i)) || (m = raw.match(/quantos caracteres (?:tem|possui) (.+)/i))){
    const alvo = nanoLocalLimparAlvo(m[1]);
    if(alvo) return `"${alvo}" tem **${alvo.length}** caractere(s).`;
  }
  if((m = raw.match(/quantas palavras (?:tem|possui) (.+)/i))){
    const alvo = nanoLocalLimparAlvo(m[1]);
    if(alvo) return `"${alvo}" tem **${alvo.split(/\s+/).filter(Boolean).length}** palavra(s).`;
  }
  if((m = raw.match(/invert[ae]r?\s+(?:o texto\s+)?(.+)/i))){
    const alvo = nanoLocalLimparAlvo(m[1]);
    if(alvo) return `Invertido: **${alvo.split('').reverse().join('')}**`;
  }
  if((m = raw.match(/mai[uú]sculo[:\s]+(.+)/i))){
    const alvo = nanoLocalLimparAlvo(m[1]);
    if(alvo) return `Em maiúsculo: **${alvo.toUpperCase()}**`;
  }
  if((m = raw.match(/min[uú]sculo[:\s]+(.+)/i))){
    const alvo = nanoLocalLimparAlvo(m[1]);
    if(alvo) return `Em minúsculo: **${alvo.toLowerCase()}**`;
  }
  return '';
}

/* ---------- datas ---------- */
function nanoLocalDataCalculo(raw, q){
  if(/que horas|hora atual|hora agora/.test(q) && !/dia da semana/.test(q)){
    return `Agora são **${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}** no horário do dispositivo.`;
  }
  const dm = raw.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
  if(dm && (/dia da semana/.test(q) || /faltam/.test(q))){
    const dia=+dm[1], mes=+dm[2], ano = dm[3] ? (dm[3].length===2 ? 2000+ +dm[3] : +dm[3]) : new Date().getFullYear();
    const d = new Date(ano, mes-1, dia);
    if(d.getDate()!==dia || d.getMonth()!==mes-1){
      return 'Essa data não parece válida — confere o formato DD/MM/AAAA.';
    }
    if(/dia da semana/.test(q)){
      const dias=['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
      return `**${String(dia).padStart(2,'0')}/${String(mes).padStart(2,'0')}/${ano}** cai num(a) **${dias[d.getDay()]}**.`;
    }
    const hoje = new Date(); hoje.setHours(0,0,0,0); d.setHours(0,0,0,0);
    const diffDias = Math.round((d-hoje)/86400000);
    if(diffDias>0) return `Faltam **${diffDias}** dia(s) para ${String(dia).padStart(2,'0')}/${String(mes).padStart(2,'0')}/${ano}.`;
    if(diffDias<0) return `Essa data já passou há **${Math.abs(diffDias)}** dia(s).`;
    return 'É hoje! 🍌';
  }
  if(/data de hoje|que dia e hoje|hoje e dia|em que mes estamos|que ano e/.test(q)){
    return `Hoje é **${new Date().toLocaleDateString('pt-BR')}**.`;
  }
  return '';
}

/* ---------- arquivo do projeto (mesmo comportamento de antes) ---------- */
function nanoLocalFileAnswer(raw){
  if(typeof findProjectFile!=='function'||!currentChatId)return '';
  const n=raw.match(/(?:arquivo|file)\s+[`"']?([\w.\-/]+)[`"']?/i)?.[1];
  if(!n)return '';
  try{
    const f=findProjectFile(n,currentChatId);
    if(f){
      const vs=f.versions||[];
      const original=vs.find(v=>v.original||/original/i.test(v.label||v.version||''));
      return `Encontrei o arquivo **${n}** no projeto. Ele tem ${vs.length||1} versão(ões).${original?' A versão ORIGINAL também está preservada localmente.':''}`;
    }
  }catch{}
  return '';
}

/* ---------- orquestrador principal ---------- */
async function nanoLocalRespond(messages){
  const raw = nanoLocalLastUser(messages);
  const q = nanoLocalNormalize(raw);
  const project = !!(typeof isCurrentChatProject!=='undefined' && isCurrentChatProject);

  if(!q) return 'Tô aqui 🍌. Pode falar comigo — estou rodando no modo local, sem API.';

  // 1) Handlers "de código": cálculo, sorteio, texto, datas, arquivo do projeto.
  //    Ficam ANTES da IA real de propósito — um modelo pequeno erra conta e data
  //    com facilidade; código determinístico não erra.
  const handlers = [
    () => nanoLocalMoedaDado(q),
    () => nanoLocalNumeroAleatorio(q),
    () => nanoLocalParidadePrimo(raw, q),
    () => nanoLocalTextoUtil(raw),
    () => nanoLocalDataCalculo(raw, q),
    () => nanoLocalMatematica(raw, q),
    () => nanoLocalFileAnswer(raw),
  ];
  for(const h of handlers){
    let out=''; try{ out = h(); }catch{ out=''; }
    if(out) return out;
  }

  // 2) Pergunta sobre projeto/memória (mesmo comportamento de antes).
  if(project && /projeto|memoria|arquivos|scripts|bug|progresso/.test(q)){
    let extra='';
    try{ extra = typeof projectKnowledgeBlock==='function' ? projectKnowledgeBlock(raw).replace(/\s+/g,' ').slice(0,700) : ''; }catch{}
    return `Estou no **modo local do projeto** 🍌. ${extra?'Tenho o índice/contexto local disponível. ':''}Posso consultar o que estiver salvo neste dispositivo, mas não tenho o conhecimento geral de um modelo remoto.`;
  }

  // 3) IA real local (WebLLM), só se já estiver carregada (arquivo
  //    nano-banana-ia-real.js). Se não tiver, ou se der erro, cai pra base
  //    de treinamento normal — nunca trava o chat.
  if(typeof nanoLLMResponder === 'function' && window.nanoLLM && window.nanoLLM.engine){
    let respostaIA = null;
    try{ respostaIA = await nanoLLMResponder(messages); }catch{ respostaIA = null; }
    if(respostaIA) return respostaIA;
  }

  // 4) Base de treinamento (conversa, identidade, ajuda, piada etc.).
  const base = Array.isArray(window.NANO_LOCAL_TREINAMENTO) ? window.NANO_LOCAL_TREINAMENTO : [];
  for(const intent of base){
    try{
      if(intent && typeof intent.match==='function' && intent.match(q)){
        const respostas = Array.isArray(intent.respostas) && intent.respostas.length ? intent.respostas : null;
        if(respostas) return respostas[Math.floor(Math.random()*respostas.length)];
      }
    }catch{}
  }

  // 5) Fallback final (mesmo espírito do comportamento anterior).
  const dicaIA = (typeof nanoLLMSuportado==='function' && nanoLLMSuportado() && !(window.nanoLLM && window.nanoLLM.engine))
    ? ' Dá pra carregar um modelo de IA real nas configurações pra respostas melhores.'
    : '';
  return `Entendi: "${raw.slice(0,180)}". 🍌 Estou no modo local, então não tenho um modelo remoto pra gerar uma resposta longa. Posso lidar com cálculos, sorteios, texto, datas e o contexto já salvo no app.${dicaIA} Para uma resposta de IA completa, selecione um provedor com API.`;
}
