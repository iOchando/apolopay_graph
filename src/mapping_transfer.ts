import { near, BigInt, log, json } from "@graphprotocol/graph-ts";
import { Transfer, Wallet } from "../generated/schema";

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

  if (functionCall.methodName == "ft_transfer" || functionCall.methodName == "ft_transfer_call") {
    let jsonData = outcome.logs[0];

    if (!json.try_fromString(jsonData.replace("EVENT_JSON:", "")).isOk) return;

    let parsedJSON = json.fromString(jsonData.replace("EVENT_JSON:", ""));

    let entry = parsedJSON.toObject();

    const event = entry.get("event");
    let getData = entry.get("data");

    if (!getData || !event || event.toString() != "ft_transfer") return;

    let dataArray = getData.toArray()[0].toObject();

    if (!dataArray) return;

    const from = dataArray.get("old_owner_id");
    const to = dataArray.get("new_owner_id");
    const amount = dataArray.get("amount");

    if (!from || !to || !amount) return;

    const walletLoad = Wallet.load(to.toString());

    if (!walletLoad) return;

    let transfer = new Transfer(receipt.id.toBase58());
    transfer.from = from.toString();
    transfer.to = to.toString();
    transfer.amount = amount.toString();
    transfer.timestamp = transfer.timestamp = BigInt.fromString(blockHeader.timestampNanosec.toString());
    transfer.save();
  }
}
