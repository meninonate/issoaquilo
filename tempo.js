/* =====================================================================
   JOGO "QUAL DUROU MAIS?"

   Como o jogo funciona:
   1. A partida tem 5 rodadas.
   2. Em cada rodada aparecem 2 curiosidades sorteadas do perguntas.json.
   3. O jogador clica na que acha que durou MAIS.
   4. Depois de 1 segundo, os tempos aparecem: verde (certo) e vermelho (errado).
   5. Nenhuma curiosidade se repete na mesma partida.
   6. Depois da 5ª rodada aparece a pontuação (ex.: 5/5) e o botão "Voltar".

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

// Nome do arquivo com as curiosidades (fica na mesma pasta do tempo.html).
const ARQUIVO_PERGUNTAS = 'perguntas.json';

// Quantas rodadas tem cada partida.
const TOTAL_RODADAS = 5;

// Espera antes de mostrar a resposta. Em milissegundos: 1000 = 1 segundo.
const ATRASO_REVELACAO = 1000;

/* Lista de unidades de tempo. Cada uma tem:
   - chave:    nome usado no perguntas.json (ex.: "anos")
   - segundos: quantos segundos ela vale (para poder comparar)
   - singular/plural: como escrever na tela ("1 ano" / "2 anos")
   Regra adotada: 1 ano = 365 dias e 1 mês = 30 dias.
   Tudo vira segundos porque "2 anos" e "44 dias" só podem ser
   comparados se estiverem na mesma unidade. */
const UNIDADES = [
  { chave: 'anos',     segundos: 365 * 24 * 3600, singular: 'ano',     plural: 'anos' },
  { chave: 'meses',    segundos: 30 * 24 * 3600,  singular: 'mês',     plural: 'meses' },
  { chave: 'dias',     segundos: 24 * 3600,       singular: 'dia',     plural: 'dias' },
  { chave: 'horas',    segundos: 3600,            singular: 'hora',    plural: 'horas' },
  { chave: 'minutos',  segundos: 60,              singular: 'minuto',  plural: 'minutos' },
  { chave: 'segundos', segundos: 1,               singular: 'segundo', plural: 'segundos' },
];


/* ---------------------------------------------------------------------
   2) ELEMENTOS DA PÁGINA
   ---------------------------------------------------------------------
   document.getElementById('x') procura no HTML o elemento com id="x".
   O nome aqui precisa ser IDÊNTICO ao id do HTML, senão o jogo quebra. */

// document.querySelectorAll('#opcoes button') procura TODOS os <button> que
// estão dentro do elemento com id="opcoes" e devolve uma lista:
// botoes[0] = A, botoes[1] = B.
const botoes = document.querySelectorAll('#opcoes button');

// Os 2 textos do tempo (os <p> dentro de #opcoes, embaixo de cada botão):
// tempos[0] = A, tempos[1] = B.
const tempos = document.querySelectorAll('#opcoes p');

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

let perguntas = [];      // todas as curiosidades lidas do JSON
let fila = [];           // as 10 sorteadas da partida (2 por rodada)
let rodadaAtual = 0;     // 0 = primeira rodada, 4 = última
let acertos = 0;         // pontos do jogador
let respondida = false;  // true = já clicou nesta rodada (true/false)


/* ---------------------------------------------------------------------
   4) FUNÇÕES DE APOIO
   --------------------------------------------------------------------- */

/* totalEmSegundos
   Recebe um item (ex.: { anos: 2, meses: 6 }) e devolve a duração em
   segundos. Para cada unidade, multiplica a quantidade pelos segundos
   dela e soma tudo. */
function totalEmSegundos(item) {
  // .reduce() percorre a lista UNIDADES somando os resultados.
  return UNIDADES.reduce((soma, unidade) => {
    // item[unidade.chave] lê, por exemplo, item.anos.
    // "|| 0" = "ou zero": se o item não tiver essa unidade, vale 0.
    const quantidade = item[unidade.chave] || 0;
    return soma + quantidade * unidade.segundos;
  }, 0); // 0 = valor inicial da soma
}

/* formatarTempo
   Recebe um item e devolve o tempo escrito por extenso:
   { anos: 2, meses: 6 } -> "2 anos e 6 meses"
   { dias: 44 }          -> "44 dias" */
function formatarTempo(item) {
  const partes = UNIDADES
    // .filter() mantém só as unidades que o item tem.
    .filter((unidade) => item[unidade.chave])
    // .map() transforma cada unidade em texto, ex.: "2 anos".
    // `${ }` coloca valores dentro de um texto (template string).
    // "condição ? A : B" = se a condição for verdadeira usa A, senão B
    // (aqui escolhe entre singular e plural).
    .map((unidade) => {
      const quantidade = item[unidade.chave];
      const nome = quantidade === 1 ? unidade.singular : unidade.plural;
      return `${quantidade} ${nome}`;
    });

  // Com 0 ou 1 parte, não precisa juntar nada.
  if (partes.length <= 1) return partes[0] || '';

  // Com 2 ou mais: tudo menos o último separado por vírgula, depois " e " e o último.
  return partes.slice(0, -1).join(', ') + ' e ' + partes[partes.length - 1];
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

/* pegarItensDaRodada
   Devolve as 2 curiosidades da rodada atual.
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
  // Mistura as curiosidades e pega as 10 primeiras (5 rodadas x 2).
  // Como cada uma aparece uma vez só, nenhuma se repete.
  fila = embaralhar(perguntas).slice(0, TOTAL_RODADAS * 2);

  rodadaAtual = 0;
  acertos = 0;

  mostrarRodada();
}

/* mostrarRodada
   Coloca as 2 curiosidades na tela e deixa tudo pronto para o clique. */
function mostrarRodada() {
  const itens = pegarItensDaRodada();
  respondida = false;

  // .forEach() repete o código para cada botão.
  // "botao" = o botão da vez; "i" = posição dele (0 = A, 1 = B).
  // "=>" é a forma curta de escrever uma função.
  botoes.forEach((botao, i) => {
    botao.textContent = itens[i].texto;   // escreve a curiosidade
    botao.disabled = false;               // destrava o botão

    // Tira as cores (classes CSS) da rodada anterior.
    botao.classList.remove('correta', 'errada');

    tempos[i].textContent = '';  // limpa o tempo
    tempos[i].hidden = true;     // esconde o tempo
  });

  resultado.textContent = '';  // apaga mensagens antigas
  botaoProxima.hidden = true;  // esconde o "Próxima" até o jogador responder
}

/* escolher
   Roda quando o jogador clica em uma curiosidade.
   "indice" = posição do botão clicado (0 = A, 1 = B). */
function escolher(indice) {
  // Se já respondeu, sai da função (evita clicar duas vezes).
  if (respondida) return;
  respondida = true;

  // Trava os dois botões.
  botoes.forEach((b) => (b.disabled = true));

  const itens = pegarItensDaRodada();

  // Duração das duas curiosidades em segundos.
  const totais = itens.map(totalEmSegundos);

  // Math.max() devolve o maior número; os "..." espalham a lista como
  // valores separados.
  const maior = Math.max(...totais);

  // Acertou se o total do botão clicado for o maior (true/false).
  // Em caso de empate, conta como certo.
  const acertou = totais[indice] === maior;

  // setTimeout(função, tempo): roda a função DEPOIS do tempo (em ms).
  setTimeout(() => {
    botoes.forEach((botao, i) => {
      tempos[i].textContent = formatarTempo(itens[i]); // ex.: "43 anos"
      tempos[i].hidden = false;                        // mostra o tempo

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
  areaQuiz.hidden = true;        // esconde as curiosidades
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

    // As curiosidades estão dentro da chave "tempo" do JSON.
    perguntas = dados.tempo;
  } catch (erro) {
    // Cai aqui se o arquivo não existir ou se o HTML foi aberto com
    // duplo clique (o navegador bloqueia assim).
    resultado.textContent =
      'Não consegui carregar perguntas.json. Abra o site por um servidor (ex.: Live Server do VS Code).';
    console.error(erro); // mostra o erro técnico no Console (F12)
    return; // para aqui; o jogo não começa
  }

  // Precisa de pelo menos 10 curiosidades (5 rodadas x 2).
  if (perguntas.length < TOTAL_RODADAS * 2) {
    resultado.textContent = `Preciso de pelo menos ${TOTAL_RODADAS * 2} curiosidades no perguntas.json.`;
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
