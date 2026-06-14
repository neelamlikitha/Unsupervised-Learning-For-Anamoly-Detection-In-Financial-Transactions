Simulate Transaction – Ela Fill Cheyyali
Form lo 4 fields unnayi. Dataset lo use chesina exact values ivvo:

Field 1: Amount (INR)
Number type. Ee range lo try cheyyachu:

Scenario	Amount Range	Expected Result
Normal transaction	100 – 4,600	NORMAL
Slightly high	5,000 – 15,000	SUSPICIOUS
Very high (fraud test)	50,000 – 1,50,000	HIGH_RISK
Field 2: Merchant
Dataset lo ivi use chesindi – ila type cheyyachu:

Amazon
Flipkart
Myntra
BigBasket
Swiggy
Zomato
Uber
Ola
MakeMyTrip
BookMyShow
Paytm Mall
Ajio
(Any text type cheyyachu – model merchant name use cheyyadu, amount & frequency matrame consider cheyyatam jarigindi)

Field 3: Category
Exact ga ivi type cheyyali (lowercase, exact match):

shopping
food
travel
entertainment
groceries
utilities
electronics
Field 4: Channel
Exact ga ivi type cheyyali:

online
pos
atm
upi
Example Fill-ups – Copy-Paste Ready
Normal transaction test:

Field	Value
Amount	1500
Merchant	Amazon
Category	shopping
Channel	online
HIGH_RISK test (fraud simulation):

Field	Value
Amount	85000
Merchant	Flipkart
Category	electronics
Channel	online
SUSPICIOUS test:

Field	Value
Amount	8000
Merchant	Zomato
Category	food
Channel	upi
