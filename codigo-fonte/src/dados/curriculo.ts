// Textos copiados do currículo (Downloads/Curriculo revisado/curriculo-sem-telefone.html), sem reescrever.
// Telão (Currículo), Contato e Certificações leem daqui.

export const PDF = 'curriculo.pdf';

export const PERFIL = {
  nome: 'Lucas Nunes Amaral',
  cargo: 'Analista de Infraestrutura Júnior',
  foco: 'Microsoft 365, Entra ID e Active Directory | AWS Certified Cloud Practitioner',
  local: 'Guaíba - RS (Grande Porto Alegre)',
  // Resumo próprio do jogo (aprovado por ele em 2026-10-21; o do PDF continua o original).
  // Só fatos do currículo; a automação fica no cartão da Zallpy e na loja, não no resumo.
  chamada: 'Analista de infraestrutura com experiência em ambientes Microsoft, suporte multiplataforma e segurança.',
  resumo: [
    'Na Zallpy Digital, cuidei de identidades e acessos no Active Directory, Entra ID e Microsoft 365 (entradas, grupos, licenças e permissões), atendi chamados N1/N2 em Windows, Linux e macOS, fui o principal responsável pelos MacBooks da empresa (preparação, suporte e desvínculo do Apple ID nos desligamentos) e segui rotinas de segurança da ISO/IEC 27001 e do TISAX.',
    'Na Prefeitura de Guaíba, dei suporte presencial e remoto a setores como saúde, escolas e assistência social, administrei usuários e permissões no Active Directory, configurei roteadores e switches, acompanhei os alertas do Zabbix e treinei 3 novos estagiários.',
  ],
  selos: ['AWS Certified Cloud Practitioner', 'Inglês avançado (C1)', 'Graduado em Análise e Desenvolvimento de Sistemas'],
  objetivo: 'Procuro vaga de Analista de Infraestrutura Júnior ou Suporte N2.',
};

export const COMPETENCIAS: { area: string; itens: string[] }[] = [
  { area: 'Identidade e Microsoft', itens: ['Active Directory', 'Microsoft Entra ID', 'Microsoft 365', 'Gestão de identidades e acessos (IAM)'] },
  { area: 'Automação', itens: ['PowerShell', 'Batch Script', 'Autounattend.xml', 'n8n', 'Git e GitHub'] },
  { area: 'Cloud', itens: ['AWS (IAM, EC2, S3)', 'Microsoft Azure (fundamentos)', 'Ambientes híbridos'] },
  { area: 'Redes e monitoramento', itens: ['TCP/IP', 'DNS', 'DHCP', 'Roteadores e switches', 'Zabbix'] },
  { area: 'Segurança', itens: ['Hardening de Windows', 'Políticas de segurança', 'ISO/IEC 27001', 'TISAX'] },
  { area: 'Sistemas e suporte', itens: ['Windows', 'Linux', 'macOS', 'Suporte N1/N2', 'Troubleshooting', 'Documentação técnica'] },
];

export const CERTIFICACOES: { nome: string; quem: string; quando: string }[] = [
  { nome: 'AWS Certified Cloud Practitioner (CLF-C02)', quem: 'Amazon Web Services', quando: 'válida de 2025 a 2028' },
  { nome: 'AWS re/Start (graduado)', quem: 'Escola da Nuvem', quando: '2025' },
  { nome: 'Administrador de Redes Multiplataforma', quem: 'Sisnema', quando: '2024' },
];

export const FORMACAO: { nome: string; onde: string; quando?: string }[] = [
  { nome: 'Análise e Desenvolvimento de Sistemas', onde: 'Universidade Ulbra', quando: 'concluído em Dez 2025' },
  { nome: 'Inglês avançado (C1)', onde: 'Instituto de Idiomas Insight' },
];

export const CONTATOS = {
  email: 'Amlucaz@gmail.com',
  linkedin: { texto: 'linkedin.com/in/lucas-amaral-ti', url: 'https://www.linkedin.com/in/lucas-amaral-ti' },
  github: { texto: 'github.com/Lucas-Amaralz', url: 'https://github.com/Lucas-Amaralz' },
};
