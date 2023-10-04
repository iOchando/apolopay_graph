import { near, BigInt, log, json } from "@graphprotocol/graph-ts";
import { Wallet } from "../generated/schema";

export function handleReceipt(receipt: near.ReceiptWithOutcome): void {
  const actions = receipt.receipt.actions;
  for (let i = 0; i < actions.length; i++) {
    handleAction(actions[i], receipt.receipt, receipt.block.header, receipt.outcome);
  }
}

function handleAction(action: near.ActionValue, receipt: near.ActionReceipt, blockHeader: near.BlockHeader, outcome: near.ExecutionOutcome): void {
  if (action.kind !== near.ActionKind.FUNCTION_CALL) {
    log.info("Early return: {}", ["Not a function call"]);
    return;
  }
  const functionCall = action.toFunctionCall();

  if (functionCall.methodName == "set_wallet") {
    let jsonData = outcome.logs[0];

    if (!json.try_fromString(jsonData).isOk) return;

    let parsedJSON = json.fromString(jsonData);

    let entry = parsedJSON.toObject();

    const getWallet = entry.get("wallet");

    if (!getWallet) return;

    let wallet = new Wallet(getWallet.toString());
    wallet.save();
  }
}
