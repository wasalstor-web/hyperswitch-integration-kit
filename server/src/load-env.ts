import { config } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
config({ path: path.join(root, ".env") });
const paymentLocal = path.join(root, ".env.payment.local");
if (existsSync(paymentLocal)) {
  config({ path: paymentLocal, override: true });
}
