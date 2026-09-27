/* =========================================================================
   NANO BANANA OFICIAL — IA REAL LOCAL (WebLLM, opcional)
   -------------------------------------------------------------------------
   Isso roda um modelo de linguagem de VERDADE, local, via WebGPU, usando a
   biblioteca WebLLM (https://github.com/mlc-ai/web-llm). Sem chave de API.

   DUAS EXIGÊNCIAS REAIS DO NAVEGADOR — nada aqui consegue contornar isso,
   é limitação da própria Web (WebGPU), não do código:

   1) Precisa rodar em HTTPS ou http://localhost. Abrir o arquivo direto do
      aparelho (file://, inclusive o "abrir com" do Android, que cai em
      file://) NÃO FUNCIONA — o navegador bloqueia WebGPU nesse caso. Pra
      usar de verdade, hospeda o preview.html em algum lugar com HTTPS
      (GitHub Pages, Netlify, Vercel, Cloudflare Pages — todos têm plano
      grátis pra site estático) ou roda um servidor local.
   2) Precisa de WebGPU no navegador (Chrome/Edge 113+, Chrome Android
      121+, Safari/iOS recentes). Sem isso não tem fallback pra rodar o
      modelo — mas o app continua funcionando normal com o motor de
      padrões (nano-banana-motor-local.js), só que sem ser IA de verdade.

   O primeiro carregamento baixa o modelo (uma vez só, o tamanho escolhido
   abaixo) e guarda em cache no próprio navegador; depois disso, carrega
   rápido mesmo sem internet — até o navegador limpar o cache.
   ========================================================================= */

const NANO_LLM_MODELOS = [
  { id:'leve',        nome:'Leve · ~130 MB',        modelo:'SmolLM2-360M-Instruct-q4f16_1-MLC' },
  { id:'equilibrado', nome:'Equilibrado · ~900 MB',  modelo:'Llama-3.2-1B-Instruct-q4f16_1-MLC' },
  { id:'capaz',       nome:'Mais capaz · ~2,2 GB',   modelo:'Llama-3.2-3B-Instruct-q4f16_1-MLC' },
];

window.nanoLLM = {
  engine: null,
  carregando: false,
  nivelCarregado: null,
  nivelSelecionado: (typeof localStorage!=='undefined' && localStorage.getItem('nb_llm_nivel')) || 'equilibrado',
};

function nanoLLMSuportado(){
  return typeof window!=='undefined' && !!window.isSecureContext && !!(typeof navigator!=='undefined' && navigator.gpu);
}

function nanoLLMMotivoIndisponivel(){
  if(typeof window==='undefined' || !window.isSecureContext){
    return 'Precisa rodar via HTTPS ou http://localhost — abrir o arquivo direto (file://) não funciona pra WebGPU.';
  }
  if(!(typeof navigator!=='undefined' && navigator.gpu)){
    return 'Este navegador/dispositivo não tem WebGPU disponível (ou está desatualizado).';
  }
  return '';
}

function nanoLLMAtualizarUI(){
  const st = window.nanoLLM;
  try{
    document.querySelectorAll('[data-sg-llm]').forEach(e=>e.classList.toggle('active', e.dataset.sgLlm===st.nivelSelecionado));
    const texto = document.getElementById('nanoLlmStatus');
    if(texto && !st.carregando){
      if(st.engine && st.nivelCarregado===st.nivelSelecionado){
        texto.textContent = 'Modelo carregado ✅ — o modo local já responde com IA real.';
      }else if(st.engine){
        texto.textContent = `Modelo "${st.nivelCarregado}" carregado. Clique em carregar de novo pra trocar de nível.`;
      }else{
        const motivo = nanoLLMMotivoIndisponivel();
        texto.textContent = motivo ? ('⚠️ ' + motivo) : 'Nenhum modelo carregado ainda — clique em "Carregar modelo".';
      }
    }
  }catch{}
}

function nanoLLMSelecionarNivel(id){
  window.nanoLLM.nivelSelecionado = id;
  try{ localStorage.setItem('nb_llm_nivel', id); }catch{}
  nanoLLMAtualizarUI();
}

async function nanoLLMCarregar(){
  const st = window.nanoLLM;
  if(st.carregando) return;
  const barra = document.getElementById('nanoLlmBarra');
  const texto = document.getElementById('nanoLlmStatus');

  const motivo = nanoLLMMotivoIndisponivel();
  if(motivo){
    if(texto) texto.textContent = '⚠️ ' + motivo;
    window.showToast?.(motivo);
    return;
  }

  const cfg = NANO_LLM_MODELOS.find(m=>m.id===st.nivelSelecionado) || NANO_LLM_MODELOS[1];
  st.carregando = true;
  if(texto) texto.textContent = 'Carregando biblioteca...';
  if(barra) barra.style.width = '2%';

  try{
    if(!window.__webllmMod){
      window.__webllmMod = await import('https://esm.run/@mlc-ai/web-llm');
    }
    const { CreateMLCEngine } = window.__webllmMod;
    const engine = await CreateMLCEngine(cfg.modelo, {
      initProgressCallback: (p)=>{
        const pct = Math.round((p?.progress||0)*100);
        if(barra) barra.style.width = pct + '%';
        if(texto) texto.textContent = (p?.text || 'Carregando modelo...') + ` (${pct}%)`;
      }
    });
    st.engine = engine;
    st.nivelCarregado = cfg.id;
    if(barra) barra.style.width = '100%';
    window.showToast?.('Modelo de IA real carregado — o modo local agora responde com IA de verdade.');
  }catch(e){
    const msg = String((e && e.message) || e);
    let amigavel = 'Não consegui carregar o modelo: ' + msg;
    if(/webgpu/i.test(msg)) amigavel = 'O navegador não conseguiu iniciar o WebGPU. ' + (nanoLLMMotivoIndisponivel() || 'Verifica se o navegador está atualizado e tenta de novo.');
    if(texto) texto.textContent = '⚠️ ' + amigavel;
    if(barra) barra.style.width = '0%';
    window.showToast?.(amigavel);
  }finally{
    st.carregando = false;
    nanoLLMAtualizarUI();
  }
}

/* Chamada pelo orquestrador (nanoLocalRespond). Devolve null se não tiver
   modelo carregado ou se algo der errado — aí quem chamou cai pra base de
   treinamento/fallback normal, sem travar o chat. */
async function nanoLLMResponder(messages){
  const st = window.nanoLLM;
  if(!st.engine) return null;
  const msgsFormatadas = (messages||[])
    .filter(m => m && (m.role==='user' || m.role==='assistant' || m.role==='system') && typeof m.content==='string')
    .slice(-8); // modelo pequeno e local — contexto curto é suficiente e mais rápido
  try{
    const resposta = await st.engine.chat.completions.create({
      messages: msgsFormatadas,
      temperature: 0.6,
      max_tokens: 250,
    });
    const texto = resposta?.choices?.[0]?.message?.content;
    return (texto && texto.trim()) ? texto.trim() : null;
  }catch(e){
    console.error('Nano LLM local — erro ao gerar resposta:', e);
    return null;
  }
}
