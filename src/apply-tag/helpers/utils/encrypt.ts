import * as crypto from "crypto";

const encrypt = (salt: string, data: string, secret = "cnna") => {
  return crypto.createHmac('sha256', secret).update(salt + data).digest("hex");
}

export default encrypt;