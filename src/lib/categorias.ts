/**
 * Categorias padrão para despesas (pessoal e Arcade).
 * Usado no form de despesas, lançamentos de cartão e gráficos.
 */
export const CATEGORIAS_DESPESA = [
  "Alimentação",
  "Transporte",
  "Casa",
  "Saúde",
  "Educação",
  "Lazer",
  "Compras",
  "Serviços",
  "Folha de pagamento",
  "Fornecedores",
  "Outros",
] as const;

export type CategoriaDespesa = (typeof CATEGORIAS_DESPESA)[number];
