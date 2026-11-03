//+------------------------------------------------------------------+
//| OverrideSync.mq5 : envoie l'état du compte MT5 à OVERRIDE.DESK    |
//| Solde, fonds propres, marge, positions ouvertes et historique.   |
//| Installation : MQL5/Experts, puis Outils > Options > Expert       |
//| Advisors > « Autoriser WebRequest » pour l'adresse de l'API.      |
//+------------------------------------------------------------------+
#property strict
#property version   "1.00"
#property description "Synchronisation OVERRIDE.DESK (lecture seule : aucun ordre n'est passé)"

input string InpUrl          = "https://votre-projet.vercel.app/api/v1/trading/mt-sync"; // Adresse de l'API
input string InpKey          = "";   // Clé d'EA fournie par OVERRIDE.DESK (affichée une seule fois)
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

string BuildJson(){
   string j="{\"account\":{\"platform\":\"MT5\",\"login\":\""+IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN))+"\""
     +",\"server\":\""+Esc(AccountInfoString(ACCOUNT_SERVER))+"\",\"broker\":\""+Esc(AccountInfoString(ACCOUNT_COMPANY))+"\""
     +",\"currency\":\""+AccountInfoString(ACCOUNT_CURRENCY)+"\",\"balance\":"+Num(AccountInfoDouble(ACCOUNT_BALANCE))
     +",\"equity\":"+Num(AccountInfoDouble(ACCOUNT_EQUITY))+",\"margin\":"+Num(AccountInfoDouble(ACCOUNT_MARGIN))
     +",\"free_margin\":"+Num(AccountInfoDouble(ACCOUNT_MARGIN_FREE))+",\"leverage\":"+IntegerToString(AccountInfoInteger(ACCOUNT_LEVERAGE))+"},\"positions\":[";
   int n=PositionsTotal(); bool first=true;
   for(int i=0;i<n;i++){
      ulong t=PositionGetTicket(i); if(t==0) continue;
      string side=(PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_BUY)?"buy":"sell";
      if(!first) j+=","; first=false;
      j+="{\"ticket\":\""+IntegerToString((long)t)+"\",\"symbol\":\""+Esc(PositionGetString(POSITION_SYMBOL))+"\",\"side\":\""+side+"\""
        +",\"volume\":"+Num(PositionGetDouble(POSITION_VOLUME))+",\"open_price\":"+Num(PositionGetDouble(POSITION_PRICE_OPEN))
        +",\"current_price\":"+Num(PositionGetDouble(POSITION_PRICE_CURRENT))+",\"stop_loss\":"+Num(PositionGetDouble(POSITION_SL))
        +",\"take_profit\":"+Num(PositionGetDouble(POSITION_TP))+",\"swap\":"+Num(PositionGetDouble(POSITION_SWAP))
        +",\"profit\":"+Num(PositionGetDouble(POSITION_PROFIT))+",\"opened_at\":\""+Ts((datetime)PositionGetInteger(POSITION_TIME))+"\"}";
   }
   j+="],\"history\":[";
   first=true;
   if(HistorySelect(TimeCurrent()-InpHistoryDays*86400,TimeCurrent())){
      int d=HistoryDealsTotal();
      for(int i=0;i<d;i++){
         ulong k=HistoryDealGetTicket(i); if(k==0) continue;
         long entry=HistoryDealGetInteger(k,DEAL_ENTRY);
         if(entry!=DEAL_ENTRY_OUT && entry!=DEAL_ENTRY_OUT_BY) continue;
         long typ=HistoryDealGetInteger(k,DEAL_TYPE);
         if(typ!=DEAL_TYPE_BUY && typ!=DEAL_TYPE_SELL) continue;
         string side=(typ==DEAL_TYPE_SELL)?"buy":"sell";   // une sortie par vente clôt une position acheteuse
         if(!first) j+=","; first=false;
         j+="{\"ticket\":\""+IntegerToString((long)k)+"\",\"symbol\":\""+Esc(HistoryDealGetString(k,DEAL_SYMBOL))+"\",\"side\":\""+side+"\""
           +",\"volume\":"+Num(HistoryDealGetDouble(k,DEAL_VOLUME))+",\"close_price\":"+Num(HistoryDealGetDouble(k,DEAL_PRICE))
           +",\"profit\":"+Num(HistoryDealGetDouble(k,DEAL_PROFIT))+",\"commission\":"+Num(HistoryDealGetDouble(k,DEAL_COMMISSION))
           +",\"swap\":"+Num(HistoryDealGetDouble(k,DEAL_SWAP))+",\"closed_at\":\""+Ts((datetime)HistoryDealGetInteger(k,DEAL_TIME))+"\"}";
      }
   }
   j+="]}";
   return j;
}
void Send(){
   char data[],result[]; string rh;
   string json=BuildJson();
   int len=StringToCharArray(json,data,0,WHOLE_ARRAY,CP_UTF8);
   if(len>0) ArrayResize(data,len-1);                     // retire le zéro final
   string headers="Content-Type: application/json\r\nX-Override-Key: "+InpKey+"\r\n";
   ResetLastError();
   int code=WebRequest("POST",InpUrl,headers,10000,data,result,rh);
   if(code==-1) Print("OverrideSync : WebRequest refusée (",GetLastError(),"). Autorisez l'adresse dans Outils > Options > Expert Advisors.");
   else if(code!=200) Print("OverrideSync : HTTP ",code," ",CharArrayToString(result,0,WHOLE_ARRAY,CP_UTF8));
}
