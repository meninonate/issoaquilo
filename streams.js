/* =====================================================================
   JOGO "QUEM TEM MAIS STREAMS?" (SPOTIFY)

   Como o jogo funciona:
   1. A partida tem 5 rodadas.
   2. Em cada rodada aparecem 2 artistas sorteados do perguntas.json
      (da chave "streams").
   3. O jogador clica no artista que acha que tem MAIS streams.
   4. Depois de 1 segundo, os streams aparecem: verde (certo) e vermelho (errado).
   5. Nenhum artista se repete na mesma partida.
   6. Os dois artistas de uma rodada NUNCA têm o mesmo número (sem empate).
   7. Depois da 5ª rodada aparece a pontuação (ex.: 5/5) e o botão "Voltar".

   Organização do arquivo (de cima para baixo):
   1) CONFIGURAÇÕES   -> valores que você pode mudar
   2) ELEMENTOS       -> ligação entre o JS e o HTML
   3) ESTADO          -> o que o jogo precisa "lembrar"
   4) FUNÇÕES DE APOIO -> ferramentas pequenas
   5) FLUXO DO JOGO   -> funções que fazem o jogo andar
   6) INÍCIO          -> onde tudo começa

   GLOSSÁRIO RÁPIDO:
   - const = variável que NÃO muda      - let = variável que PODE mudar
   - function = bloco de código com nome, que você "chama" quando precisar
   - [ ] = lista                        - { } = objeto (pares "nome: valor")
   - // = comentário de uma linha (texto que o computador ignora)
   ===================================================================== */


/* ---------------------------------------------------------------------
   1) CONFIGURAÇÕES
   --------------------------------------------------------------------- */

// Nome do arquivo com os artistas (fica na mesma pasta do streams.html).
const ARQUIVO_PERGUNTAS = 'perguntas.json';

// Quantas rodadas tem cada partida.
const TOTAL_RODADAS = 5;

// Espera antes de mostrar a resposta. Em milissegundos: 1000 = 1 segundo.
const ATRASO_REVELACAO = 1000;


/* ---------------------------------------------------------------------
   2) ELEMENTOS DA PÁGINA
   ---------------------------------------------------------------------
   document.getElementById('x') procura no HTML o elemento com id="x".
   O nome aqui precisa ser IDÊNTICO ao id do HTML, senão o jogo quebra. */

// document.querySelectorAll('#opcoes button') procura TODOS os <button> que
// estão dentro do elemento com id="opcoes" e devolve uma lista:
// botoes[0] = A, botoes[1] = B.
const botoes = document.querySelectorAll('#opcoes button');

// Os 2 textos dos streams (os <p> dentro de #opcoes, embaixo de cada botão):
// numeros[0] = A, numeros[1] = B.
const numeros = document.querySelectorAll('#opcoes p');

const resultado = document.getElementById('resultado');     // mensagens de erro
const botaoProxima = document.getElementById('proxima');    // botão "Próxima"

// A tela do quiz é o bloco #opcoes (mais o botão "Próxima").
// A tela final são os 3 elementos abaixo, que ficam escondidos (hidden)
// até o fim da partida. elemento.hidden = true esconde; = false mostra.
const areaQuiz = document.getElementById('opcoes');
const nota = document.getElementById('nota');       // círculo com "5/5"
const rotulo = document.getElementById('rotulo');   // texto "Pontuação"
const voltar = document.getElementById('voltar');   // link "Voltar"


/* ---------------------------------------------------------------------
   3) ESTADO DO JOGO
   ---------------------------------------------------------------------
   Variáveis que mudam durante o jogo (por isso "let"). */

let perguntas = [];      // todos os artistas lidos do JSON
let fila = [];           // os 10 sorteados da partida (2 por rodada)
let rodadaAtual = 0;     // 0 = primeira rodada, 4 = última
let acertos = 0;         // pontos do jogador
let respondida = false;  // true = já clicou nesta rodada (true/false)


/* ---------------------------------------------------------------------
   4) FUNÇÕES DE APOIO
   --------------------------------------------------------------------- */

/* formatarStreams
   Recebe o número de streams e devolve o texto curto para a tela:
   36100000 -> "36,1 mi"   |   583200 -> "583,2 mil"   |   5000000 -> "5 mi"

   Como funciona:
   - A partir de 1.000.000 divide por 1 milhão e escreve "mi".
   - Abaixo disso divide por 1.000 e escreve "mil".
   - .toLocaleString('pt-BR', { maximumFractionDigits: 1 }) usa vírgula
     como separador decimal (36,1) e no máximo 1 casa depois da vírgula;
     se a casa for zero, ela some (5,0 vira "5"). */
function formatarStreams(total) {
  const opcoes = { maximumFractionDigits: 1 };

  if (total >= 1000000) {
    return (total / 1000000).toLocaleString('pt-BR', opcoes) + ' mi';
  }
  return (total / 1000).toLocaleString('pt-BR', opcoes) + ' mil';
}

/* embaralhar
   Recebe uma lista e devolve uma CÓPIA em ordem aleatória
   (a original não muda). */
function embaralhar(lista) {
  // [...lista] cria a cópia.
  const copia = [...lista];

  // Percorre de trás para frente (i-- = diminui 1 a cada volta).
  for (let i = copia.length - 1; i > 0; i--) {
    // Sorteia um número inteiro de 0 até i.
    // Math.random() = decimal entre 0 e 1; Math.floor() = arredonda para baixo.
    const j = Math.floor(Math.random() * (i + 1));

    // Troca de lugar os itens das posições i e j.
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }

  return copia;
}

/* montarFila
   Monta a fila da partida: uma lista com 10 artistas (5 pares).
   Regras: nenhum artista se repete e, dentro de um par, os dois
   números são DIFERENTES (assim nunca existe empate).

   Como funciona:
   - "restantes" = artistas embaralhados que ainda não foram usadas.
   - Pega a primeira (A) e procura, na lista, a primeira com número
     diferente do dela (B). Esse par vai para a fila e os dois saem de
     "restantes". Repete até ter 5 pares. */
function montarFila() {
  const restantes = embaralhar(perguntas);
  const novaFila = [];

  // while = repete ENQUANTO a condição for verdadeira.
  while (novaFila.length < TOTAL_RODADAS * 2 && restantes.length >= 2) {
    // .shift() tira o primeiro item da lista e devolve ele.
    const a = restantes.shift();

    // .findIndex() devolve a posição do primeiro item que passa no teste
    // (ou -1 se nenhum passar). Aqui: número diferente do de A.
    const posicaoB = restantes.findIndex((item) => item.streams !== a.streams);

    // Se não achou ninguém com número diferente, descarta A e tenta de novo.
    if (posicaoB === -1) continue;

    // .splice(posição, 1) remove 1 item dessa posição e devolve numa lista;
    // o [0] pega o item de dentro dessa lista.
    const b = restantes.splice(posicaoB, 1)[0];

    novaFila.push(a, b); // coloca o par na fila
  }

  return novaFila;
}

/* pegarItensDaRodada
   Devolve os 2 artistas da rodada atual.
   A fila tem 10 itens: rodada 0 usa as posições 0 e 1, rodada 1 usa
   2 e 3, e assim por diante (rodadaAtual * 2 e o seguinte). */
function pegarItensDaRodada() {
  return [fila[rodadaAtual * 2], fila[rodadaAtual * 2 + 1]];
}


/* ---------------------------------------------------------------------
   5) FLUXO DO JOGO
   --------------------------------------------------------------------- */

/* iniciarPartida
   Começa uma partida do zero. */
function iniciarPartida() {
  // Sorteia os 10 artistas (sem repetir e sem pares empatados).
  fila = montarFila();

  rodadaAtual = 0;
  acertos = 0;

  mostrarRodada();
}

/* mostrarRodada
   Coloca os 2 artistas na tela e deixa tudo pronto para o clique. */
function mostrarRodada() {
  const itens = pegarItensDaRodada();
  respondida = false;

  // .forEach() repete o código para cada botão.
  // "botao" = o botão da vez; "i" = posição dele (0 = A, 1 = B).
  // "=>" é a forma curta de escrever uma função.
  botoes.forEach((botao, i) => {
    botao.textContent = itens[i].texto;   // escreve o nome do artista
    botao.disabled = false;               // destrava o botão

    // Tira as cores (classes CSS) da rodada anterior.
    botao.classList.remove('correta', 'errada');

    numeros[i].textContent = '';  // limpa o texto
    numeros[i].hidden = true;     // esconde o texto
  });

  resultado.textContent = '';  // apaga mensagens antigas
  botaoProxima.hidden = true;  // esconde o "Próxima" até o jogador responder
}

/* escolher
   Roda quando o jogador clica em um artista.
   "indice" = posição do botão clicado (0 = A, 1 = B). */
function escolher(indice) {
  // Se já respondeu, sai da função (evita clicar duas vezes).
  if (respondida) return;
  respondida = true;

  // Trava os dois botões.
  botoes.forEach((b) => (b.disabled = true));

  const itens = pegarItensDaRodada();

  // Os streams dos dois artistas, numa lista: [streams de A, streams de B].
  const totais = itens.map((item) => item.streams);

  // Math.max() devolve o maior número; os "..." espalham a lista como
  // valores separados.
  const maior = Math.max(...totais);

  // Acertou se o número do botão clicado for o maior (true/false).
  // (Como montarFila evita empate, nunca há dois "maiores".)
  const acertou = totais[indice] === maior;

  // setTimeout(função, tempo): roda a função DEPOIS do tempo (em ms).
  setTimeout(() => {
    botoes.forEach((botao, i) => {
      numeros[i].textContent = formatarStreams(totais[i]); // ex.: "36,1 mi"
      numeros[i].hidden = false;                          // mostra o texto

      // O maior ganha a classe 'correta' (verde); o outro, 'errada' (vermelho).
      botao.classList.add(totais[i] === maior ? 'correta' : 'errada');
    });

    // "+= 1" = soma 1.
    if (acertou) acertos += 1;

    // Mostra o botão "Próxima".
    botaoProxima.hidden = false;
  }, ATRASO_REVELACAO);
}

/* avancar
   Roda quando o jogador clica em "Próxima". */
function avancar() {
  // Na 5ª rodada (índice 4) não há próxima: mostra a pontuação.
  if (rodadaAtual === TOTAL_RODADAS - 1) {
    mostrarPontuacao();
  } else {
    rodadaAtual += 1;
    mostrarRodada();
  }
}

/* mostrarPontuacao
   Esconde o quiz e mostra a pontuação final. */
function mostrarPontuacao() {
  nota.textContent = `${acertos}/${TOTAL_RODADAS}`; // ex.: "4/5"
  areaQuiz.hidden = true;        // esconde os artistas
  botaoProxima.hidden = true;    // esconde o "Próxima"
  nota.hidden = false;           // mostra a nota, o "Pontuação" e o "Voltar"
  rotulo.hidden = false;
  voltar.hidden = false;
}


/* ---------------------------------------------------------------------
   6) INÍCIO DO JOGO
   --------------------------------------------------------------------- */

/* iniciar
   Carrega o perguntas.json, liga os botões e começa a partida.
   "async/await": a função espera o arquivo chegar antes de continuar. */
async function iniciar() {
  // try/catch: tenta rodar o bloco; se der erro, pula para o catch
  // em vez de travar.
  try {
    const resposta = await fetch(ARQUIVO_PERGUNTAS); // pede o arquivo
    const dados = await resposta.json();             // converte o texto em dados do JS

    // Os artistas estão dentro da chave "streams" do JSON.
    perguntas = dados.streams;
  } catch (erro) {
    // Cai aqui se o arquivo não existir, se o JSON tiver erro (ex.: vírgula
    // faltando) ou se o HTML foi aberto com duplo clique.
    resultado.textContent =
      'Não consegui carregar perguntas.json. Abra o site por um servidor (ex.: Live Server do VS Code).';
    console.error(erro); // mostra o erro técnico no Console (F12)
    return; // para aqui; o jogo não começa
  }

  // Precisa de pelo menos 10 artistas (5 rodadas x 2).
  if (!perguntas || perguntas.length < TOTAL_RODADAS * 2) {
    resultado.textContent = `Preciso de pelo menos ${TOTAL_RODADAS * 2} artistas no perguntas.json.`;
    return;
  }

  // addEventListener('click', função) = "quando clicarem aqui, rode isto".
  // A seta () => evita que escolher(i) rode agora; ele só roda no clique.
  botoes.forEach((botao, i) => botao.addEventListener('click', () => escolher(i)));

  // Aqui passamos "avancar" sem parênteses: entregamos a função para o
  // navegador chamar no clique, em vez de chamá-la agora.
  botaoProxima.addEventListener('click', avancar);

  iniciarPartida();
}

// Esta linha liga tudo: chama iniciar() assim que o arquivo carrega.
iniciar();