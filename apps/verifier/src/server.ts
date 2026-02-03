import Fastify from "fastify";

const server = Fastify({
  logger: true,
});

const version = process.env.VERIFIER_VERSION ?? "0.1.0";
const commit = process.env.COMMIT_SHA ?? "dev";

server.get("/health", async () => ({
  ok: true,
  version,
  commit,
}));

server.post("/attest", async (_request, reply) => {
  reply.code(200);
  return { message: "not implemented yet" };
});

const port = Number(process.env.PORT ?? 3000);

if (import.meta.url === `file://${process.argv[1]}`) {
  server
    .listen({ port, host: "0.0.0.0" })
    .then(() => {
      server.log.info(`Verifier listening on port ${port}`);
    })
    .catch((err) => {
      server.log.error(err, "Failed to start verifier");
      process.exit(1);
    });
}

export default server;
