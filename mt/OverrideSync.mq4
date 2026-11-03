//+------------------------------------------------------------------+
//| OverrideSync.mq4 : envoie l'état du compte MT4 à OVERRIDE.DESK    |
//| Installation : MQL4/Experts, puis Outils > Options > Expert       |
//| Advisors > « Autoriser WebRequest » pour l'adresse de l'API.      |
//+------------------------------------------------------------------+
#property strict
#property version   "1.00"
#property description "Synchronisation OVERRIDE.DESK (lecture seule : aucun ordre n'est passé)"

input string InpUrl          = "https://votre-projet.vercel.app/api/v1/trading/mt-sync"; // Adresse de l'API
input string InpKey          = "";   // Clé d'EA fournie par OVERRIDE.DESK
input int    InpIntervalSec  = 30;   // Fréquence d'envoi (secondes)
input int    InpHistoryDays  = 30;   // Historique envoyé (jours)

string Esc(string s){ StringReplace(s,"\\","\\\\"); StringReplace(s,"\"","\\\""); return s; }
string Num(double v){ return DoubleToString(v,8); }
string Ts(datetime t){ return TimeToString(t,TIME_DATE|TIME_SECONDS); }

int OnInit(){
   if(StringLen(InpKey)==0){ Print("OverrideSync : renseignez la clé d'EA"); return(INIT_PARAMETERS_INCORRECT); }
   EventSetTimer(MathMax(10,InpIntervalSec));
   Send();
   return(INIT_SUCCEEDED);
}
void OnDeinit(const int reason){ EventKillTimer(); }
void OnTimer(){ Send(); }

string Order(bool closed){
   string side=(OrderType()==OP_BUY)?"buy":"sell";
   string j="{\"ticket\":\""+IntegerToString(OrderTicket())+"\",\"symbol\":\""+Esc(OrderSymbol())+"\",\"side\":\""+side+"\""
     +",\"volume\":"+Num(OrderLots())+",\"open_price\":"+Num(OrderOpenPrice())+",\"stop_loss\":"+Num(OrderStopLoss())
     +",\"take_profit\":"+Num(OrderTakeProfit())+",\"swap\":"+Num(OrderSwap())+",\"profit\":"+Num(OrderProfit())
     +",\"opened_at\":\""+Ts(OrderOpenTime())+"\"";
   if(closed) j+=",\"close_price\":"+Num(OrderClosePrice())+",\"commission\":"+Num(OrderCommission())+",\"closed_at\":\""+Ts(OrderCloseTime())+"\"";
   else j+=",\"current_price\":"+Num(OrderClosePrice());   // pour un ordre ouvert, OrderClosePrice() = cours actuel
   return j+"}";
}
string BuildJson(){
   string j="{\"account\":{\"platform\":\"MT4\",\"login\":\""+IntegerToString(AccountNumber())+"\",\"server\":\""+Esc(AccountServer())+"\""
     +",\"broker\":\""+Esc(AccountCompany())+"\",\"currency\":\""+AccountCurrency()+"\",\"balance\":"+Num(AccountBalance())
     +",\"equity\":"+Num(AccountEquity())+",\"margin\":"+Num(AccountMargin())+",\"free_margin\":"+Num(AccountFreeMargin())
     +",\"leverage\":"+IntegerToString(AccountLeverage())+"},\"positions\":[";
   bool first=true;
   for(int i=0;i<OrdersTotal();i++){
      if(!OrderSelect(i,SELECT_BY_POS,MODE_TRADES)) continue;
      if(OrderType()!=OP_BUY && OrderType()!=OP_SELL) continue;
      if(!first) j+=","; first=false; j+=Order(false);
   }
   j+="],\"history\":[";
   first=true; datetime since=TimeCurrent()-InpHistoryDays*86400;
   for(int i=0;i<OrdersHistoryTotal();i++){
      if(!OrderSelect(i,SELECT_BY_POS,MODE_HISTORY)) continue;
      if(OrderType()!=OP_BUY && OrderType()!=OP_SELL) continue;
      if(OrderCloseTime()<since) continue;
      if(!first) j+=","; first=false; j+=Order(true);
   }
   return j+"]}";
}
void Send(){
   char data[],result[]; string rh;
   string json=BuildJson();
   int len=StringToCharArray(json,data,0,WHOLE_ARRAY,CP_UTF8);
   if(len>0) ArrayResize(data,len-1);
   string headers="Content-Type: application/json\r\nX-Override-Key: "+InpKey+"\r\n";
   ResetLastError();
   int code=WebRequest("POST",InpUrl,headers,10000,data,result,rh);
   if(code==-1) Print("OverrideSync : WebRequest refusée (",GetLastError(),"). Autorisez l'adresse dans Outils > Options > Expert Advisors.");
   else if(code!=200) Print("OverrideSync : HTTP ",code," ",CharArrayToString(result,0,WHOLE_ARRAY,CP_UTF8));
}
