/**
 * Frases reutilizadas em mais de um lugar. Texto de uso único fica na própria tela.
 * Guia: frases curtas, dizem o que aconteceu e o próximo passo, sem termos internos.
 */
export const MSG = {
  generica: "Não foi possível concluir a ação. Tente novamente.",
  sessaoExpirada: "Sua sessão expirou. Entre novamente para continuar.",
  servidor: "Algo deu errado do nosso lado. Tente novamente em instantes.",
  muitasTentativas: "Muitas tentativas em pouco tempo. Aguarde um instante e tente de novo.",
  semConexao: "Não conseguimos conectar. Verifique sua internet e tente de novo.",
  semPermissao: "Você não tem permissão para fazer isso.",
  dadosInvalidos: "Alguns dados estão inválidos. Revise os campos e tente de novo.",
  camposObrigatorios: "Preencha todos os campos obrigatórios.",
  credenciaisIncorretas: "E-mail ou senha incorretos. Confira os dados e tente de novo.",
  loginIndisponivel: "Não conseguimos fazer o login agora. Tente de novo em instantes.",
  servicoDeLoginIndisponivel: "Não conseguimos conectar ao serviço de login agora.",
  emailNaoConfirmado: "Falta confirmar seu e-mail. Procure a mensagem de confirmação na caixa de entrada ou no spam.",
  emailParaConfirmarNoCadastro:
    "Falta confirmar seu e-mail. Procure a mensagem de confirmação na caixa de entrada ou no spam e depois entre na sua conta.",
  emailJaCadastrado: "Já existe uma conta com este e-mail. Entre ou recupere a senha.",
  senhaFraca: "Escolha uma senha mais forte: 8 caracteres ou mais, com maiúscula, minúscula, número e símbolo.",
  senhaIgualAAtual: "A nova senha precisa ser diferente da atual.",
  emailInvalido: "Informe um e-mail válido.",
  cadastrosFechados: "Cadastros estão indisponíveis no momento.",
  pagamentoIndisponivel: "Não conseguimos abrir o pagamento agora. Tente de novo em instantes.",
} as const;

export function loginSocialFalhou(provedor: string): string {
  return `Não conseguimos entrar com o ${provedor}. Tente de novo ou use e-mail e senha.`;
}

export function falhaAoCarregar(o_que: string): string {
  return `Não conseguimos carregar ${o_que}. Atualize a página para tentar de novo.`;
}

type PapelDaConta = "profissional" | "empresa";

/** Aviso de quem entrou pela aba do tipo errado de conta. */
export function avisoDeTipoDeConta(papel: PapelDaConta) {
  if (papel === "profissional") {
    return {
      titulo: "Vamos continuar por aqui?",
      descricao:
        "Você está entrando com uma conta de profissional de saúde. Para acessar seu perfil e suas oportunidades, entre como profissional.",
      rotulo: "Continuar como profissional",
      rotuloSecundario: "Agora não",
    };
  }
  return {
    titulo: "Vamos continuar por aqui?",
    descricao:
      "Esta é uma conta de empresa ou pessoa. Para publicar demandas e encontrar profissionais, entre como empresa ou pessoa.",
    rotulo: "Continuar como empresa ou pessoa",
    rotuloSecundario: "Agora não",
  };
}
