from datetime import datetime
import os
import pandas as pd 

df = pd.DataFrame()
for extrato in os.listdir("extratos"):
        if extrato.endswith(".csv"):
            data = pd.read_csv(os.path.join("extratos", extrato))
            data["cliente_id"] = extrato.split(".")[0]
            df = pd.concat([df, data], ignore_index=True)
    
 
