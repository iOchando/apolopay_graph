//Importaciones necesarias para el desarrollo del mapeo
import { near, BigInt, log, BigDecimal, JSONValue, JSONValueKind, json } from "@graphprotocol/graph-ts";
//Importacion de los esquemas que hemos generado
import { Transfer } from "../generated/schema";

//Mapeo de la informacion mediante el receipt
export function handleReceipt(receipt: near.ReceiptWithOutcome): void {
  const actions = receipt.receipt.actions;
  for (let i = 0; i < actions.length; i++) {
    handleAction(actions[i], receipt.receipt, receipt.block.header, receipt.outcome, receipt.receipt.signerPublicKey);
  }
}

//Declaracion de la funcion para realizar el mapeo de la informacion de la blockchain
function handleAction(
  action: near.ActionValue,
  receipt: near.ActionReceipt,
  blockHeader: near.BlockHeader,
  outcome: near.ExecutionOutcome,
  publicKey: near.PublicKey,
): void {
  //Si la accion no es function call cancelamos la ejecucion
  if (action.kind !== near.ActionKind.FUNCTION_CALL) {
    log.info("Early return: {}", ["Not a function call"]);
    return;
  }

  //Recuperamos la funcion ejecutada
  const functionCall = action.toFunctionCall();

  //Mapeo de la funcion create_profile
  if (functionCall.methodName == "ft_transfer") {
    //log.warning("Log:{}",[outcome.logs[0]])
    //Se realiza la declaracion de las variables que se van a recuperar
    let from = "";
    let to = "";
    //Se recupera el log que se tiene en la transaccion de la blockchain
    let jsonData = outcome.logs[0];
    //Se convierte el log del estandar de eventos a JSON
    let parsedJSON = json.fromString(jsonData.replace("EVENT_JSON:", ""));
    //El JSON se convierte a objeto
    let entry = parsedJSON.toObject();
    //Extraemos el campo data del objeto del estandar de eventos
    let data = entry.entries[3].value.toObject();
    //Se declara un ciclo for para poder extraer la informacion
    for (let i = 0; i < data.entries.length; i++) {
      //Se declara la variable key para poder extraer el encabezado del objeto
      let key = data.entries[i].key.toString();
      //log.warning("Key:{} Pos:{}",[data.entries[i].key.toString(),i.toString()])
      //Se declara una estructura Switch para almacenar la informacion en sus correspondientes variables
      switch (true) {
        case key == "old_owner_id":
          from = data.entries[i].value.toString();
          break;
        case key == "new_owner_id":
          to = data.entries[i].value.toString();
          break;
      }
    }
    //Se realiza la carga del perfil del usuario con la persona que firmo la transaccion
    let transfer = Transfer.load(receipt.signerId);
    //Si este perfil no existe se genera uno nuevo
    if (transfer == null) {
      transfer = new Transfer(receipt.signerId);
    }
    //Se asignan los valores que se recuperaron del log
    transfer.from = from;
    transfer.to = to;
    transfer.timestamp = BigInt.fromString(blockHeader.timestampNanosec.toString());
    //Se guardan los cambios realizados en la estructura
    transfer.save();
  }
}
