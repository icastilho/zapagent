import type { KnowledgeContext } from './types';

export const salesKnowledge: KnowledgeContext = {
  businessSummary:
    'A Facilitoy aluga brinquedos infantis para uso em casa e festas. Para casa, a proposta e ter brinquedos adequados para a fase da crianca e poder trocar depois. Para festa, a proposta e montar um espaco em que as criancas fiquem entretidas durante o evento.',
  differentiators: [
    'nao acumula brinquedos em casa',
    'acompanha a fase da crianca',
    'praticidade para os pais',
    'experiencia mais rica para a crianca',
  ],
  allowedClaims: [
    'Ajudar a escolher entre festa e casa',
    'Explicar de forma curta que os brinquedos sao adequados para a fase da crianca',
    'Dizer que valores e disponibilidade precisam ser verificados',
    'Recomendar o proximo passo com apenas uma pergunta',
  ],
  forbiddenClaims: [
    'Inventar preco',
    'Inventar disponibilidade',
    'Inventar nomes de kits ou produtos',
    'Despejar catalogo completo',
    'Mandar respostas longas ou com varias perguntas',
  ],
  recommendationHint:
    'Para casa: coletar idade, depois dor, depois oferecer opcoes. Para festa: coletar quantidade de criancas, local, idade e data antes de recomendar.',
  approvedTemplates: {
    comoFunciona:
      'Funciona assim: a gente leva brinquedos ideais pra idade da crianca e voce pode trocar depois, sem acumular em casa.',
    askContext:
      'E para festa ou para uso em casa?',
    askAge:
      'Qual a idade dele(a)?',
    askPain:
      'O que mais te incomoda hoje quando o assunto e entreter ele(a)?',
    askDate:
      'Me passa a data que eu verifico pra voce 😊',
    askChildrenCount:
      'Quantas criancas devem brincar?',
    askLocation:
      'Vai ser em casa ou salao?',
    priceFallback:
      'Posso verificar o valor certinho pra voce 😊',
    availabilityFallback:
      'Me passa a data que eu verifico pra voce 😊',
    handoff:
      'Vou encaminhar isso para o time te ajudar certinho 😊',
  },
};

export function getKnowledgeSummary(): string {
  return [
    salesKnowledge.businessSummary,
    `Diferenciais: ${salesKnowledge.differentiators.join(', ')}.`,
    `Permitido: ${salesKnowledge.allowedClaims.join('; ')}.`,
    `Proibido: ${salesKnowledge.forbiddenClaims.join('; ')}.`,
    `Direcao: ${salesKnowledge.recommendationHint}`,
  ].join('\n');
}
