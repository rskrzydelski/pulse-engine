------MVP-----------------
DONE!
--------Marketing---------------

------TASKS-----------------------------
- update blog
- add support for rest of farms
- add popups to cards with description, descriptions like supported pools, disclaimer 
- add logs/errors messages to the user during on chain analysis
- returned value can't be null?
export async function rpc_getProvidedLiquidity(
     for (let i = 0; i < add_rm_reciepts.length; i++) {
       const data = [];
       const reciept = add_rm_reciepts[i]
+
       // iterate logs inside receipt
       for (let l = 0; l < reciept.logs.length; l++) {
- 
         const {log_on_contract, event} = _parseReceiptLog(reciept.logs[l]);
-
-        if (log_on_contract === null || event === null) return null;
+        if (log_on_contract === null || event === null) continue;

- implement autoformatter
- implement pre-commit
- fix typescript errors
- handle todo's
- implement tests
- advanced debugging
------PERFORMANCE IDEAS------------------
- czy twój kod na pewno jest asynchroniczy?
- make contract creation at the beggining in one place before user type account
- make some optimal indexed data structure for storing interface fragments to avoid expensive iteration
- use switch instead of multiple if statement

-------QUESTIONS-----------------------
- what is PermittableToken? I see it in from Ethereum tokens
- why masterchef contract in case of calling deposit function doesn't emit Event?
