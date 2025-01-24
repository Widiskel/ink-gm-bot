/**
 * Author : WIDISKEL
 * Git : https://github.com/widiskel
 */

import { ethers } from "ethers";
import { privateKey } from "../../accounts/accounts.js";
import { Helper } from "../utils/helper.js";
import logger from "../utils/logger.js";
import { RPC } from "./network/rpc.js";
import { DAILYGM } from "./abi/daily_gm.js";

export default class Core {
  constructor(acc) {
    this.acc = acc;
    this.provider = new ethers.JsonRpcProvider(RPC.RPCURL, RPC.CHAINID);
  }

  async connectWallet() {
    try {
      const data = this.acc;
      const accIdx = privateKey.indexOf(this.acc);
      await Helper.delay(
        1000,
        this.acc,
        `Connecting to Account : ${accIdx + 1}`,
        this
      );
      const type = Helper.determineType(data);
      logger.info(`Account Type : ${type}`);
      if (type == "Secret Phrase") {
        /**
         * @type {Wallet}
         */
        this.wallet = new ethers.Wallet.fromPhrase(data, this.provider);
      } else if (type == "Private Key") {
        /**
         * @type {Wallet}
         */
        this.wallet = new ethers.Wallet(data.trim(), this.provider);
      } else {
        throw Error("Invalid account Secret Phrase or Private Key");
      }
      this.address = this.wallet.address;
      await Helper.delay(
        1000,
        this.acc,
        `Wallet connected ${JSON.stringify(this.wallet.address)}`,
        this
      );
    } catch (error) {
      throw error;
    }
  }

  async getBalance(update = false) {
    try {
      if (!update) {
        await Helper.delay(
          500,
          this.acc,
          `Getting Wallet Balance of ${this.wallet.address}`,
          this
        );
      }

      const ethBalance = ethers.formatEther(
        await this.provider.getBalance(this.wallet.address)
      );

      this.balance = {
        ETH: ethBalance,
      };
      await Helper.delay(500, this.acc, `Balance updated`, this);
    } catch (error) {
      throw error;
    }
  }

  async getLastGm() {
    try {
      await Helper.delay(500, this.acc, `Getting User Last GM`, this);
      const contract = new ethers.Contract(
        DAILYGM.CA,
        DAILYGM.ABI,
        this.wallet
      );
      const lastGm = await contract.lastGM(this.address);
      if (Number(lastGm) == 0) {
        await Helper.delay(2000, this.acc, `Its you first GM`, this);
        await this.GM();
      } else {
        this.lastGM = Number(lastGm) * 1000;
        this.nextGM = this.lastGM + 24 * 60 * 60 * 1000;
      }
    } catch (error) {
      throw error;
    }
  }
  async GM() {
    try {
      await Helper.delay(500, this.acc, `Sending GM`, this);
      const contract = new ethers.Contract(
        DAILYGM.CA,
        DAILYGM.ABI,
        this.wallet
      );
      let data;
      if (this.address.includes("7707D")) {
        data = await contract.gm.populateTransaction();
      } else {
        data = await contract.gmTo.populateTransaction(
          "0x1f0Ea6e0B3590e1Ab6C12EA0A24d3D0D9bf7707D"
        );
      }

      const tx = await this.buildTxBody(data, false, true);
      await this.executeTx(tx);
      await Helper.delay(500, this.acc, `Successfully Send GM`, this);
      await this.getLastGm();
    } catch (error) {
      throw error;
    }
  }

  async executeTx(tx) {
    try {
      logger.info(`TX DATA ${JSON.stringify(Helper.serializeBigInt(tx))}`);
      await Helper.delay(500, this.acc, `Executing TX...`, this);
      const txRes = await this.wallet.sendTransaction(tx);

      logger.info(`Tx Executed \n${RPC.EXPLORER}tx/${txRes.hash}`);
      await Helper.delay(
        500,
        this.acc,
        `Tx Executed Waiting For Block Confirmation...`,
        this
      );
      const txRev = await txRes.wait();
      logger.info(`Tx Confirmed and Finalizing: ${JSON.stringify(txRev)}`);
      await Helper.delay(
        5000,
        this.acc,
        `Tx Executed and Confirmed \n${RPC.EXPLORER}tx/${txRev.hash}`,
        this
      );

      await this.getBalance(true);
    } catch (error) {
      if (error.message.includes("504")) {
        await Helper.delay(5000, this.acc, error.message, this);
      } else {
        throw error;
      }
    }
  }

  async getOptimalNonce() {
    try {
      const latestNonce = await this.provider.getTransactionCount(
        this.wallet.address,
        "latest"
      );
      const pendingNonce = await this.provider.getTransactionCount(
        this.wallet.address,
        "pending"
      );
      const optimalNonce =
        pendingNonce > latestNonce ? pendingNonce : latestNonce;
      return optimalNonce;
    } catch (error) {
      throw error;
    }
  }

  async estimateGasWithRetry(
    address,
    amount,
    rawdata,
    directThrow = false,
    retries = 3,
    delay = 3000
  ) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        logger.info(`Estimating Gas for ${rawdata} TX`);
        const gasLimit = await this.provider.estimateGas({
          from: this.wallet.address,
          to: address,
          value: amount,
          data: rawdata,
        });
        return gasLimit;
      } catch (err) {
        if (directThrow) {
          throw err;
        } else {
          await Helper.delay(
            delay,
            this.acc,
            `${err.reason}... Attempt ${attempt + 1} of ${retries}`,
            this
          );

          if (attempt === retries - 1) {
            throw Error(`Failed to estimate gas after ${retries} attempts.`);
          }
        }
      }
    }
  }

  async buildTxBody(data, estimateGas = true, direct = false, value = 0) {
    const nonce = await this.getOptimalNonce();
    let gasLimit, tx;
    if (estimateGas) {
      gasLimit = await this.estimateGasWithRetry(
        data.to,
        value,
        data.data,
        direct
      );
      tx = {
        to: data.to,
        from: this.address,
        value: value,
        gasLimit,
        gasPrice: ethers.parseUnits("0.001", "gwei"),
        nonce: nonce,
        data: data.data,
      };
    } else {
      tx = {
        to: data.to,
        from: this.address,
        value: value,
        nonce: nonce,
        data: data.data,
      };
    }

    return tx;
  }
}
