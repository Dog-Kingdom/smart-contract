# Gacha Explaination

## Function
|Function|Description|
|-------|-----------|
|createGachaEvent|create new record of gacha event|
|editGachaEvent|overwrite an existing record of gacha event with new information|
|addBoxData|this function just could be call by backend server to push box data into event by each type box|
|addChildBox|add information of child box to gacha event|
|buyGachaBox|update quantity box in gacha event and then mint box nft to user|
|unbox|verify and move item in box to user as an nft and then burn this box nft|

## Error message
|Message|Description|
|-------|-----------|
|DK1|Gacha: Sender is not operator|
|DK2|Gacha: Sender is not admin|
|DK3|Event is not exist|
|DK4|Event has been pushed data in. Can not edit|
|DK5|Box data lists must not be empty|
|DK6|Box data and id lists must have the same length|
|DK7|Type box is not exist in event|
|DK8|Status is not processing|
|DK9|Exceed total boxes|
|DK10|Exceed boxes by type|
|DK11|Exceed total child boxes|
|DK12|Exceed child boxes by type|
|DK13|Caller is invalid|
|DK14|Not set fee receiver|
|DK15|Token currency is not whitelist|
|DK16|Event hasn't started yet|
|DK17|Event has ended|
|DK18|Event is not active|
|DK19|Out of stock|
|DK20|Out of stock of this type box|
|DK21|Error event|
|DK22|Not set price box|
|DK23|Wallet is invalid|
|DK24|Wallet is not owner of box|
|DK25|Status is invalid|
|DK26|Event is cancel, cannot change status|
|DK27|Can not change status at the moment|
|DK28|Token currency is invalid|
|DK29|New fee receiver is invalid|
|DK30|New box contract is invalid|
|DK31|New dog contract is invalid|
|DK32|New equipment contract is invalid|
|DK33|Total boxes by rarity list must have ten elements|
|DK34|Child boxes by type length must have five elements|
|DK35|Total boxes by rarity must be equal boxes by type|
|DK36|total child box by grand type must equal grand child boxes|
|DK37|total child box by meta type must equal meta child boxes|
|DK38|Box price must greater than zero|
|DK39|Total child boxes adding by type must equal total child boxes|
|DK40|Total boxes by type must be equal total boxes|
|DK41|Box Data is invalid|
|DK42|Dog Data is invalid|
|DK43|Equip Data is invalid|
|DK44|Token Data is invalid|
|DK45|amount of child box invalid|
