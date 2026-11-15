import type { MathQuestion } from '../types/game';
import { generateEquacaoQuestion } from '../lib/mathEngine';

export interface LessonStep {
  title: string;
  description: string;
  formula?: string;
}

export interface WorkedExample {
  title: string;
  problem: string;
  steps: string[];
  answer: string;
}

export interface LessonTopic {
  id: string;
  order: string;
  title: string;
  summary: string;
  tip: string;
  steps: LessonStep[];
  examples: WorkedExample[];
  generateExercise: () => MathQuestion;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const LESSON_TOPICS: LessonTopic[] = [
  {
    id: 'adicao',
    order: '01',
    title: 'Adição',
    summary: 'Junte números maiores de cabeça separando dezenas e unidades.',
    tip: 'Some primeiro os números redondos (dezenas) e deixe as unidades por último.',
    steps: [
      {
        title: 'Separe dezenas e unidades',
        description: 'Quebre cada número em partes fáceis de somar antes de juntar tudo.',
        formula: '47 + 38 → (40 + 30) + (7 + 8)',
      },
      {
        title: 'Junte os dois blocos',
        description: 'Some as dezenas entre si, depois as unidades, e una os dois resultados.',
        formula: '70 + 15 = 85',
      },
      {
        title: 'Arredonde quando estiver perto de 10',
        description: 'Se um número termina em 8 ou 9, complete até a dezena e desconte no final.',
        formula: '58 + 29 → 58 + 30 - 1 = 87',
      },
    ],
    examples: [
      {
        title: 'Separando em partes',
        problem: '64 + 29',
        steps: [
          'Some as dezenas: 60 + 20 = 80',
          'Some as unidades: 4 + 9 = 13',
          'Junte tudo: 80 + 13',
        ],
        answer: '93',
      },
      {
        title: 'Arredondando um número',
        problem: '148 + 37',
        steps: [
          'Tire 2 de 37 para completar 148 → 150',
          'O que sobrou vira 35',
          'Calcule 150 + 35',
        ],
        answer: '185',
      },
    ],
    generateExercise: () => {
      const a = randInt(18, 165);
      const b = randInt(14, 145);
      return {
        id: `ex-add-${Date.now()}`,
        prompt: `${a} + ${b} = ?`,
        helperLabel: 'Calcule a soma',
        kind: 'single',
        expectedValues: [a + b],
        formattedAnswer: String(a + b),
        eloPenaltyOnWrong: 1,
      };
    },
  },
  {
    id: 'subtracao',
    order: '02',
    title: 'Subtração',
    summary: 'Veja quanto falta do número menor até chegar ao maior.',
    tip: 'Em vez de "pedir emprestado", conte a distância até o próximo número redondo.',
    steps: [
      {
        title: 'Pense na distância entre os números',
        description: 'Dê pequenos saltos do número menor até alcançar o maior.',
        formula: '83 - 58 → +2 chega em 60 → +23 chega em 83 → 25',
      },
      {
        title: 'Tire por partes',
        description: 'Subtraia primeiro as dezenas e depois o restante das unidades.',
        formula: '94 - 36 → (94 - 30) - 6 = 58',
      },
      {
        title: 'Mova os dois números juntos',
        description: 'Somar o mesmo valor aos dois lados mantém a diferença idêntica.',
        formula: '72 - 29 → 73 - 30 = 43',
      },
    ],
    examples: [
      {
        title: 'Contando por saltos',
        problem: '105 - 68',
        steps: [
          'De 68 até 70 faltam 2',
          'De 70 até 105 faltam 35',
          'Some os dois saltos: 2 + 35',
        ],
        answer: '37',
      },
      {
        title: 'Ajustando para dezena exata',
        problem: '81 - 39',
        steps: [
          'Some +1 nos dois números: 39 vira 40 e 81 vira 82',
          'Subtraia direto: 82 - 40',
        ],
        answer: '42',
      },
    ],
    generateExercise: () => {
      const b = randInt(15, 95);
      const ans = randInt(12, 110);
      const a = b + ans;
      return {
        id: `ex-sub-${Date.now()}`,
        prompt: `${a} - ${b} = ?`,
        helperLabel: 'Calcule a diferença',
        kind: 'single',
        expectedValues: [ans],
        formattedAnswer: String(ans),
        eloPenaltyOnWrong: 1,
      };
    },
  },
  {
    id: 'multiplicacao',
    order: '03',
    title: 'Multiplicação',
    summary: 'Quebre números grandes em contas menores da tabuada.',
    tip: 'Qualquer multiplicação vira duas contas simples quando você separa dezena e unidade.',
    steps: [
      {
        title: 'Quebre o número maior',
        description: 'Multiplique a dezena e a unidade separadamente e depois some.',
        formula: '14 × 7 → (10 × 7) + (4 × 7) = 70 + 28 = 98',
      },
      {
        title: 'Dobre um e divida o outro por 2',
        description: 'Quando um número é par e o outro termina em 5, transforme em conta com 10.',
        formula: '16 × 5 → 8 × 10 = 80',
      },
      {
        title: 'Use 10 como referência para 9',
        description: 'Multiplicar por 9 é o mesmo que multiplicar por 10 e tirar o número uma vez.',
        formula: '9 × 18 → (10 × 18) - 18 = 162',
      },
    ],
    examples: [
      {
        title: 'Quebrando em duas contas',
        problem: '23 × 6',
        steps: [
          'Faça 20 × 6 = 120',
          'Faça 3 × 6 = 18',
          'Some os dois resultados: 120 + 18',
        ],
        answer: '138',
      },
      {
        title: 'Dobro e metade',
        problem: '14 × 15',
        steps: [
          'Metade de 14 é 7; dobro de 15 é 30',
          'Multiplique fácil: 7 × 30',
        ],
        answer: '210',
      },
    ],
    generateExercise: () => {
      const a = randInt(4, 24);
      const b = randInt(3, 15);
      return {
        id: `ex-mul-${Date.now()}`,
        prompt: `${a} × ${b} = ?`,
        helperLabel: 'Calcule o produto',
        kind: 'single',
        expectedValues: [a * b],
        formattedAnswer: String(a * b),
        eloPenaltyOnWrong: 1,
      };
    },
  },
  {
    id: 'divisao',
    order: '04',
    title: 'Divisão',
    summary: 'Divida pensando na multiplicação inversa ou em partes conhecidas.',
    tip: 'Pergunte sempre: "qual número multiplicado pelo divisor chega nesse total?"',
    steps: [
      {
        title: 'Pense de trás para frente',
        description: 'Transforme a divisão em uma pergunta direta de tabuada.',
        formula: '96 ÷ 8 = ?  ⇔  8 × ? = 96',
      },
      {
        title: 'Fatie o número em múltiplos fáceis',
        description: 'Separe o total em partes que você já sabe dividir e some os resultados.',
        formula: '96 ÷ 8 → (80 ÷ 8) + (16 ÷ 8) = 10 + 2 = 12',
      },
      {
        title: 'Corte zeros ou divida os dois por 2',
        description: 'Simplificar os dois números pelo mesmo fator não muda a resposta.',
        formula: '140 ÷ 20 → 14 ÷ 2 = 7',
      },
    ],
    examples: [
      {
        title: 'Fatiando o total',
        problem: '135 ÷ 5',
        steps: [
          'Quebre 135 em 100 + 35',
          'Divida cada parte: 100 ÷ 5 = 20 e 35 ÷ 5 = 7',
          'Some os resultados: 20 + 7',
        ],
        answer: '27',
      },
      {
        title: 'Simplificando antes',
        problem: '144 ÷ 12',
        steps: [
          'Divida os dois números pela metade: 72 ÷ 6',
          'Na tabuada: 6 × 12 = 72',
        ],
        answer: '12',
      },
    ],
    generateExercise: () => {
      const divisor = randInt(3, 18);
      const quotient = randInt(4, 24);
      const dividend = divisor * quotient;
      return {
        id: `ex-div-${Date.now()}`,
        prompt: `${dividend} ÷ ${divisor} = ?`,
        helperLabel: 'Calcule o quociente',
        kind: 'single',
        expectedValues: [quotient],
        formattedAnswer: String(quotient),
        eloPenaltyOnWrong: 1,
      };
    },
  },
  {
    id: 'equacao-1',
    order: '05',
    title: 'Equações de 1º grau',
    summary: 'Descubra o valor de x deixando ele sozinho de um lado do sinal de igual.',
    tip: 'Tudo o que muda de lado na igualdade troca para a operação oposta (+ ↔ - e × ↔ ÷).',
    steps: [
      {
        title: 'Junte os x de um lado e os números do outro',
        description: 'Passe termos com x para a esquerda e números soltos para a direita, trocando o sinal.',
        formula: '5x - 6 = 2x + 9  →  5x - 2x = 9 + 6',
      },
      {
        title: 'Reduza cada lado a um único termo',
        description: 'Some ou subtraia os termos parecidos para limpar a equação.',
        formula: '3x = 15',
      },
      {
        title: 'Passe o número que multiplica dividindo',
        description: 'Divida o total pelo número que acompanha o x.',
        formula: 'x = 15 ÷ 3 = 5',
      },
    ],
    examples: [
      {
        title: 'Equação simples',
        problem: '4x + 7 = 31',
        steps: [
          'Passe +7 para o outro lado como -7: 4x = 31 - 7',
          'Fica 4x = 24',
          'Divida por 4: x = 24 ÷ 4',
        ],
        answer: 'x = 6',
      },
      {
        title: 'x nos dois lados',
        problem: '7x - 5 = 3x + 15',
        steps: [
          'Agrupe os termos: 7x - 3x = 15 + 5',
          'Simplifique: 4x = 20',
          'Divida por 4: x = 20 ÷ 4',
        ],
        answer: 'x = 5',
      },
    ],
    generateExercise: () => generateEquacaoQuestion('facil'),
  },
  {
    id: 'equacao-2',
    order: '06',
    title: 'Equações de 2º grau',
    summary: 'Encontre os dois valores de x que zeram a equação usando Soma e Produto ou Bhaskara.',
    tip: 'Quando x² está sozinho (a = 1), pense em dois números que somados dão -b e multiplicados dão c.',
    steps: [
      {
        title: 'Identifique a, b e c',
        description: 'Organize na forma ax² + bx + c = 0 para enxergar cada número.',
        formula: 'x² - 7x + 12 = 0  →  a = 1, b = -7, c = 12',
      },
      {
        title: 'Atalho: Soma e Produto',
        description: 'Procure dois números cuja soma é -b e a multiplicação é c (quando a = 1).',
        formula: 'Soma = 7 e Produto = 12  →  raízes 3 e 4',
      },
      {
        title: 'Método geral: Bhaskara',
        description: 'Calcule Δ = b² - 4ac e aplique x = (-b ± √Δ) ÷ (2a).',
        formula: 'Δ = 49 - 48 = 1  →  x = (7 ± 1) ÷ 2  →  3 e 4',
      },
    ],
    examples: [
      {
        title: 'Por Soma e Produto',
        problem: 'x² - 5x + 6 = 0',
        steps: [
          'Precisamos de dois números que somam 5 e multiplicam 6',
          'Teste pares de multiplicação 6: 1×6 (soma 7) e 2×3 (soma 5)',
          'O par exato é 2 e 3',
        ],
        answer: 'x₁ = 2, x₂ = 3',
      },
      {
        title: 'Simplificando antes',
        problem: '2x² - 10x + 8 = 0',
        steps: [
          'Divida toda a equação por 2: x² - 5x + 4 = 0',
          'Agora busque soma 5 e produto 4',
          '1 + 4 = 5 e 1 × 4 = 4',
        ],
        answer: 'x₁ = 1, x₂ = 4',
      },
    ],
    generateExercise: () => {
      const r1 = randInt(-5, 6);
      let r2 = randInt(-5, 6);
      while (r2 === r1) r2 = randInt(-5, 6);
      const b = -(r1 + r2);
      const c = r1 * r2;
      const bStr =
        b === 0
          ? ''
          : b > 0
          ? ` + ${b === 1 ? '' : b}x`
          : ` - ${Math.abs(b) === 1 ? '' : Math.abs(b)}x`;
      const cStr = c === 0 ? '' : c > 0 ? ` + ${c}` : ` - ${Math.abs(c)}`;
      const sorted = [r1, r2].sort((m, n) => m - n);
      return {
        id: `ex-quad-${Date.now()}`,
        prompt: `x²${bStr}${cStr} = 0`,
        helperLabel: 'Informe as duas raízes (x₁ e x₂)',
        kind: 'quadratic_roots',
        expectedValues: sorted,
        formattedAnswer: `x₁ = ${sorted[0]}, x₂ = ${sorted[1]}`,
        eloPenaltyOnWrong: 2,
      };
    },
  },
  {
    id: 'sistemas',
    order: '07',
    title: 'Sistemas de equações',
    summary: 'Encontre x e y ao mesmo tempo eliminando uma letra por vez.',
    tip: 'Some as duas equações para cancelar uma das letras logo no primeiro passo.',
    steps: [
      {
        title: 'Cancele uma letra somando as linhas',
        description: 'Quando uma letra tem + e - iguais, somar as duas equações elimina essa letra.',
        formula: '(x + y = 10) + (x - y = 4)  →  2x = 14  →  x = 7',
      },
      {
        title: 'Troque o valor descoberto para achar a outra',
        description: 'Coloque o número encontrado em qualquer uma das duas equações iniciais.',
        formula: '7 + y = 10  →  y = 3',
      },
      {
        title: 'Confira nas duas equações',
        description: 'Teste se x e y funcionam nas duas contas ao mesmo tempo.',
        formula: '7 + 3 = 10  e  7 - 3 = 4',
      },
    ],
    examples: [
      {
        title: 'Cancelamento direto',
        problem: '2x + y = 11  e  x - y = 1',
        steps: [
          'Some as duas linhas: +y e -y se cancelam',
          'Fica 3x = 12, então x = 4',
          'Em x - y = 1: 4 - y = 1 → y = 3',
        ],
        answer: 'x = 4, y = 3',
      },
      {
        title: 'Multiplicando uma linha antes',
        problem: '3x + 2y = 16  e  x + y = 6',
        steps: [
          'Multiplique a 2ª linha por -2: -2x - 2y = -12',
          'Some com a 1ª linha: x = 4',
          'Como x + y = 6, então y = 2',
        ],
        answer: 'x = 4, y = 2',
      },
    ],
    generateExercise: () => generateEquacaoQuestion('normal'),
  },
];
