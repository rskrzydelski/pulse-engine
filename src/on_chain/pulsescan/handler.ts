export async function pulsescan_getUserTransfers(block_number: string, hash: string) {
    const user_transfers = await fetch(`api/user_transfers?start_block=${block_number}&end_block=${block_number}`);
    const user_transfers_json = await user_transfers.json();
    const transfers = user_transfers_json.filter(obj => obj.hash === hash);
    return transfers;
}


export async function pulsescan_getInternalTx(hash: string, call_type: string = '', from: string = '', to: string = '', only_on_zero_value: boolean = false) {
    let i_tx;
    const user_internal_tx = await fetch(`api/user_internal_tx?hash=${hash}`);
    i_tx = await user_internal_tx.json();

    if (call_type !== '') {
        i_tx = i_tx.filter(obj => obj.callType === call_type);
    }

    if (from !== '') {
        i_tx = i_tx.filter(obj => obj.from.toLowerCase() === from.toLowerCase());
    }

    if (to !== '') {
        i_tx = i_tx.filter(obj => obj.to.toLowerCase() === to.toLowerCase());
    }

    if (only_on_zero_value) {
        i_tx = i_tx.filter(obj => Number(obj.value) > 0);
    }

    return i_tx;
    // const val = user_internal_tx_json.find(obj => {
    //     if(obj.callType === 'call' && 
    //     obj.from.toLowerCase() === pulseX_contracts.PULSE_X_ROUTER_02.toLowerCase() && 
    //     obj.to.toLowerCase() === token_contracts.WPLS_CONTRACT_ADDRESS.toLowerCase()) {
    //       return obj;
    //     }
    // })
}