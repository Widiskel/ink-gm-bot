/**
 * Author : WIDISKEL
 * Git : https://github.com/widiskel
 */
import { Twisters } from "twisters";
import logger from "./logger.js";
import Core from "../core/core.js";
import { privateKey } from "../../accounts/accounts.js";
import { RPC } from "../core/network/rpc.js";
import { Helper } from "./helper.js";

class Twist {
  constructor() {
    /** @type  {Twisters}*/
    this.twisters = new Twisters();
  }

  /**
   * @param {string} acc
   * @param {Core} core
   * @param {string} msg
   * @param {string} delay
   */
  async log(msg = "", acc = "", core = new Core(), delay) {
    const accIdx = privateKey.indexOf(acc);
    if (delay == undefined) {
      logger.info(`Account ${accIdx + 1} - ${msg}`);
      delay = "-";
    }

    const address = core.address ?? "-";
    const balance = core.balance ?? {};
    const eth = balance.ETH ?? "-";
    const lastGm = core.lastGM;
    const nextGm = core.nextGM;
    const timeLeft = nextGm != undefined ? nextGm - Date.now() : "?";

    this.twisters.put(acc, {
      text: `
================== Account ${accIdx + 1} =================
Address         : ${address}
Balance         : ${eth} ${RPC.SYMBOL}
Last GM         : ${Helper.readTime(lastGm / 1000)}
Next GM         : ${Helper.readTime(nextGm / 1000)}
Time Left       : ${Helper.msToTime(timeLeft)}
               
Status : ${msg}
Delay : ${delay}
==============================================`,
    });
  }
  /**
   * @param {string} msg
   */
  info(msg = "") {
    this.twisters.put(2, {
      text: `
==============================================
Info : ${msg}
==============================================`,
    });
    return;
  }

  clearInfo() {
    this.twisters.remove(2);
  }

  clear(acc) {
    this.twisters.remove(acc);
  }
}
export default new Twist();
