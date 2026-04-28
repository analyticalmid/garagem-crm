# Governanca de Automacoes Externas

## Objetivo

Este documento define o padrao obrigatorio de seguranca para qualquer webhook, job, automacao externa ou integracao server-to-server conectada ao Garagem CRM.

Todas as automacoes devem operar em modo fail-closed. Se qualquer segredo, header, claim ou contexto de tenant estiver ausente, a execucao deve ser negada imediatamente.

## Regras Obrigatorias

### 1. Autenticacao obrigatoria por segredo

- Todo webhook externo deve enviar `Authorization: Bearer <segredo>` ou `x-cron-secret: <segredo>`.
- O endpoint deve rejeitar a chamada com `401` se o segredo esperado nao estiver configurado no ambiente.
- O endpoint deve rejeitar a chamada com `401` se nenhum header de autenticacao estiver presente.
- O endpoint deve rejeitar a chamada com `401` se o formato do header estiver incorreto.

Exemplo minimo:

```ts
if (!process.env.AUTO_POS_VENDA_SECRET) {
  return unauthorized();
}

const bearer = parseBearer(request.headers.get("authorization"));
const cronSecret = request.headers.get("x-cron-secret");

if (bearer !== process.env.AUTO_POS_VENDA_SECRET && cronSecret !== process.env.AUTO_POS_VENDA_SECRET) {
  return unauthorized();
}
```

### 2. Escopo de tenant obrigatorio

- Nenhuma automacao pode operar com `_tenant_id` vindo diretamente do chamador sem validacao.
- Toda execucao deve derivar o tenant a partir de `auth.uid()`, `auth.jwt()` ou de credenciais server-side amarradas a um tenant conhecido.
- Se o tenant nao puder ser resolvido com seguranca, a execucao deve falhar.

### 3. Uso restrito de `service_role`

- `service_role` so pode ser usado em:
  - Edge Functions internas;
  - cron jobs confiaveis;
  - backends protegidos fora do browser.
- `service_role` nunca deve aparecer em `VITE_*`, `NEXT_PUBLIC_*` ou qualquer bundle de frontend.
- RPCs com `SECURITY DEFINER` devem validar o chamador logo no inicio do bloco `BEGIN`.
- Se uma RPC e exclusiva para automacao, o `GRANT EXECUTE` deve ser apenas para `service_role`.

### 4. Validacao de origem e allowlist

- Sempre que a plataforma permitir, aplique allowlist de IP para o n8n, Vercel Cron ou provedor externo.
- Se a allowlist nao for viavel, use segredo forte de pelo menos 32 bytes e rotacao periodica.
- Rejeite requests vindos de ambientes nao reconhecidos.

### 5. Menor privilegio

- Webhooks nao devem retornar PII, tokens, raw payloads completos ou traces internos em respostas de erro.
- Use selects minimos e atualize somente as colunas estritamente necessarias.
- Usuarios comuns nunca devem disparar automacoes administrativas.

### 6. Logs e auditoria

- Toda automacao deve registrar:
  - timestamp;
  - nome do fluxo;
  - tenant afetado;
  - resultado;
  - identificador do recurso afetado.
- Nunca grave secrets, tokens ou cabecalhos completos em logs.
- Falhas de autenticacao devem gerar evento auditavel.

### 7. Regras especificas para n8n

- Todo workflow n8n que chamar o CRM deve usar credencial dedicada.
- O segredo deve ser armazenado no cofre do n8n, nunca hardcoded no workflow.
- O workflow deve chamar apenas endpoints internos documentados ou RPCs liberadas para `service_role`.
- O workflow deve ser exportado e versionado fora do runtime quando possivel.

## Checklist de Aprovacao

Uma automacao so pode entrar em producao se todos os itens abaixo estiverem atendidos:

- Segredo obrigatorio configurado no ambiente.
- Endpoint em fail-closed.
- Tenant resolvido com seguranca.
- Sem uso de `service_role` no frontend.
- RPCs `SECURITY DEFINER` revisadas.
- Logs sem vazamento de segredo.
- Dono tecnico definido.
- Procedimento de rotacao de segredo documentado.
