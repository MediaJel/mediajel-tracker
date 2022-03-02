import { createHmac } from "crypto";

const encrypt = (salt: string, data: string, secret = "cnna") => {
  return createHmac('sha256', secret).update(salt + data).digest("hex");
}

export default encrypt;