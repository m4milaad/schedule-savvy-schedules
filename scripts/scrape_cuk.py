from __future__ import annotations

import logging
import os
import re
import threading
from collections import deque
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse

import httpx
from bs4 import BeautifulSoup, Tag


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"

SEED_URLS =[
  "https://www.cukashmir.ac.in/",
  "https://www.cukashmir.ac.in/#/content;id=73E479D9-3245-42EE-97CF-6A4A83E898F0",
  "https://www.cukashmir.ac.in/#/departlist;id=73E479D9-3245-42EE-97CF-6A4A83E898F0",
  "https://www.cukashmir.ac.in/#/administration;id=73E479D9-3245-42EE-97CF-6A4A83E898F0",
  "https://www.cukashmir.ac.in/#/content;id=AA7E82C5-A88C-4C48-AD9E-EE83EAB27976",
  "https://www.cukashmir.ac.in/#/departlist;id=AA7E82C5-A88C-4C48-AD9E-EE83EAB27976",
  "https://www.cukashmir.ac.in/#/administration;id=AA7E82C5-A88C-4C48-AD9E-EE83EAB27976",
  "https://www.cukashmir.ac.in/#/content;id=E4DAE988-63C9-4979-9BB8-BD7FABD29507",
  "https://www.cukashmir.ac.in/#/departlist;id=E4DAE988-63C9-4979-9BB8-BD7FABD29507",
  "https://www.cukashmir.ac.in/#/administration;id=E4DAE988-63C9-4979-9BB8-BD7FABD29507",
  "https://www.cukashmir.ac.in/#/content;id=7C960BE0-3911-463F-9C0E-6B6345369501",
  "https://www.cukashmir.ac.in/#/departlist;id=7C960BE0-3911-463F-9C0E-6B6345369501",
  "https://www.cukashmir.ac.in/#/administration;id=7C960BE0-3911-463F-9C0E-6B6345369501",
  "https://www.cukashmir.ac.in/#/content;id=41DE2A78-9B02-4BDD-9990-F3400457FA48",
  "https://www.cukashmir.ac.in/#/departlist;id=41DE2A78-9B02-4BDD-9990-F3400457FA48",
  "https://www.cukashmir.ac.in/#/administration;id=41DE2A78-9B02-4BDD-9990-F3400457FA48",
  "https://www.cukashmir.ac.in/#/content;id=4A25FFFB-0396-4695-93D9-534D08A70C31",
  "https://www.cukashmir.ac.in/#/departlist;id=4A25FFFB-0396-4695-93D9-534D08A70C31",
  "https://www.cukashmir.ac.in/#/administration;id=4A25FFFB-0396-4695-93D9-534D08A70C31",
  "https://www.cukashmir.ac.in/#/content;id=8E81C471-1E4C-486C-A8A3-3D5861ED89B1",
  "https://www.cukashmir.ac.in/#/departlist;id=8E81C471-1E4C-486C-A8A3-3D5861ED89B1",
  "https://www.cukashmir.ac.in/#/administration;id=8E81C471-1E4C-486C-A8A3-3D5861ED89B1",
  "https://www.cukashmir.ac.in/#/content;id=FA656A88-1869-40EC-9C1A-D74D6E2D6DB3",
  "https://www.cukashmir.ac.in/#/departlist;id=FA656A88-1869-40EC-9C1A-D74D6E2D6DB3",
  "https://www.cukashmir.ac.in/#/administration;id=FA656A88-1869-40EC-9C1A-D74D6E2D6DB3",
  "https://www.cukashmir.ac.in/#/content;id=1284E6AB-FBA5-417F-A2D1-A2248C21D426",
  "https://www.cukashmir.ac.in/#/departlist;id=1284E6AB-FBA5-417F-A2D1-A2248C21D426",
  "https://www.cukashmir.ac.in/#/administration;id=1284E6AB-FBA5-417F-A2D1-A2248C21D426",
  "https://www.cukashmir.ac.in/#/content;id=8AAF6B9B-864F-43CA-917F-EFBE30108654",
  "https://www.cukashmir.ac.in/#/departlist;id=8AAF6B9B-864F-43CA-917F-EFBE30108654",
  "https://www.cukashmir.ac.in/#/administration;id=8AAF6B9B-864F-43CA-917F-EFBE30108654",
  "https://www.cukashmir.ac.in/#/content;id=1433E298-AD25-4AC4-9BC0-F6808C3830D2",
  "https://www.cukashmir.ac.in/#/departlist;id=1433E298-AD25-4AC4-9BC0-F6808C3830D2",
  "https://www.cukashmir.ac.in/#/administration;id=1433E298-AD25-4AC4-9BC0-F6808C3830D2",
  "https://www.cukashmir.ac.in/#/content;id=BDAE7AD6-1B11-4015-9F9E-8A7CF7065981",
  "https://www.cukashmir.ac.in/#/departlist;id=BDAE7AD6-1B11-4015-9F9E-8A7CF7065981",
  "https://www.cukashmir.ac.in/#/administration;id=BDAE7AD6-1B11-4015-9F9E-8A7CF7065981",
  "https://www.cukashmir.ac.in/#/content;id=3F5FD5EB-6536-4C89-972C-81206E10C457",
  "https://www.cukashmir.ac.in/#/departlist;id=3F5FD5EB-6536-4C89-972C-81206E10C457",
  "https://www.cukashmir.ac.in/#/administration;id=3F5FD5EB-6536-4C89-972C-81206E10C457",
  "https://www.cukashmir.ac.in/#/content;id=B2FCE217-D1C2-4B94-8FCB-C417DA80E5F0",
  "https://www.cukashmir.ac.in/#/departlist;id=B2FCE217-D1C2-4B94-8FCB-C417DA80E5F0",
  "https://www.cukashmir.ac.in/#/administration;id=B2FCE217-D1C2-4B94-8FCB-C417DA80E5F0",
  "https://www.cukashmir.ac.in/#/content;id=1F52920E-78B9-4D3D-96FC-5AFB04308D2F",
  "https://www.cukashmir.ac.in/#/departlist;id=1F52920E-78B9-4D3D-96FC-5AFB04308D2F",
  "https://www.cukashmir.ac.in/#/administration;id=1F52920E-78B9-4D3D-96FC-5AFB04308D2F",
  "https://www.cukashmir.ac.in/#/content;id=35D614BF-6FE5-4C85-B567-E46FECD7BD6A",
  "https://www.cukashmir.ac.in/#/departlist;id=35D614BF-6FE5-4C85-B567-E46FECD7BD6A",
  "https://www.cukashmir.ac.in/#/administration;id=35D614BF-6FE5-4C85-B567-E46FECD7BD6A",
  "https://www.cukashmir.ac.in/#/content;id=924F2298-AA1E-4C55-A33E-6EA0305C7FA8",
  "https://www.cukashmir.ac.in/#/departlist;id=924F2298-AA1E-4C55-A33E-6EA0305C7FA8",
  "https://www.cukashmir.ac.in/#/administration;id=924F2298-AA1E-4C55-A33E-6EA0305C7FA8",
  "https://www.cukashmir.ac.in/#/content;id=18EF03F9-FBBA-4530-831D-81A0566334F5",
  "https://www.cukashmir.ac.in/#/departlist;id=18EF03F9-FBBA-4530-831D-81A0566334F5",
  "https://www.cukashmir.ac.in/#/administration;id=18EF03F9-FBBA-4530-831D-81A0566334F5",
  "https://www.cukashmir.ac.in/#/content;id=36D7234D-1193-4A7F-B174-7EE4037F5300",
  "https://www.cukashmir.ac.in/#/departlist;id=36D7234D-1193-4A7F-B174-7EE4037F5300",
  "https://www.cukashmir.ac.in/#/administration;id=36D7234D-1193-4A7F-B174-7EE4037F5300",
  "https://www.cukashmir.ac.in/#/content;id=F1C195F3-CE78-4C49-9992-7186064229AD",
  "https://www.cukashmir.ac.in/#/departlist;id=F1C195F3-CE78-4C49-9992-7186064229AD",
  "https://www.cukashmir.ac.in/#/administration;id=F1C195F3-CE78-4C49-9992-7186064229AD",
  "https://www.cukashmir.ac.in/#/content;id=47953BC2-4446-4278-9704-C18641AFD65C",
  "https://www.cukashmir.ac.in/#/departlist;id=47953BC2-4446-4278-9704-C18641AFD65C",
  "https://www.cukashmir.ac.in/#/administration;id=47953BC2-4446-4278-9704-C18641AFD65C",
  "https://www.cukashmir.ac.in/#/content;id=B738BAD2-BFF8-40FE-AC0D-38F37335954D",
  "https://www.cukashmir.ac.in/#/departlist;id=B738BAD2-BFF8-40FE-AC0D-38F37335954D",
  "https://www.cukashmir.ac.in/#/administration;id=B738BAD2-BFF8-40FE-AC0D-38F37335954D",
  "https://www.cukashmir.ac.in/#/content;id=9B4B71EB-9994-4BFA-B250-37FCFE95AEB0",
  "https://www.cukashmir.ac.in/#/departlist;id=9B4B71EB-9994-4BFA-B250-37FCFE95AEB0",
  "https://www.cukashmir.ac.in/#/administration;id=9B4B71EB-9994-4BFA-B250-37FCFE95AEB0",
  "https://www.cukashmir.ac.in/#/content;id=E3743FBE-2721-4125-8D9E-6C0FF9EAA188",
  "https://www.cukashmir.ac.in/#/departlist;id=E3743FBE-2721-4125-8D9E-6C0FF9EAA188",
  "https://www.cukashmir.ac.in/#/administration;id=E3743FBE-2721-4125-8D9E-6C0FF9EAA188",
  "https://www.cukashmir.ac.in/#/content;id=5492074C-5FD8-4B09-946C-9C6BB0B69E22",
  "https://www.cukashmir.ac.in/#/departlist;id=5492074C-5FD8-4B09-946C-9C6BB0B69E22",
  "https://www.cukashmir.ac.in/#/administration;id=5492074C-5FD8-4B09-946C-9C6BB0B69E22",
  "https://www.cukashmir.ac.in/#/content;id=ECCECED9-0058-47DE-97AD-5244C119F5E6",
  "https://www.cukashmir.ac.in/#/departlist;id=ECCECED9-0058-47DE-97AD-5244C119F5E6",
  "https://www.cukashmir.ac.in/#/administration;id=ECCECED9-0058-47DE-97AD-5244C119F5E6",
  "https://www.cukashmir.ac.in/#/content;id=63B17F7B-CFCD-4561-8BC0-A11FD3D115C9",
  "https://www.cukashmir.ac.in/#/departlist;id=63B17F7B-CFCD-4561-8BC0-A11FD3D115C9",
  "https://www.cukashmir.ac.in/#/administration;id=63B17F7B-CFCD-4561-8BC0-A11FD3D115C9",
  "https://www.cukashmir.ac.in/#/content;id=A39DDA6E-8BB4-400B-9D95-75206DFA4385",
  "https://www.cukashmir.ac.in/#/departlist;id=A39DDA6E-8BB4-400B-9D95-75206DFA4385",
  "https://www.cukashmir.ac.in/#/administration;id=A39DDA6E-8BB4-400B-9D95-75206DFA4385",
  "https://www.cukashmir.ac.in/#/content;id=4AE43501-DB2A-4628-B671-D7C0C641D97A",
  "https://www.cukashmir.ac.in/#/departlist;id=4AE43501-DB2A-4628-B671-D7C0C641D97A",
  "https://www.cukashmir.ac.in/#/administration;id=4AE43501-DB2A-4628-B671-D7C0C641D97A",
  "https://www.cukashmir.ac.in/#/content;id=8A0E0049-6E61-42E9-AD83-A1611A7B07B6",
  "https://www.cukashmir.ac.in/#/departlist;id=8A0E0049-6E61-42E9-AD83-A1611A7B07B6",
  "https://www.cukashmir.ac.in/#/administration;id=8A0E0049-6E61-42E9-AD83-A1611A7B07B6",
  "https://www.cukashmir.ac.in/#/content;id=5020992D-D865-4454-9698-043D0214B570",
  "https://www.cukashmir.ac.in/#/departlist;id=5020992D-D865-4454-9698-043D0214B570",
  "https://www.cukashmir.ac.in/#/administration;id=5020992D-D865-4454-9698-043D0214B570",
  "https://www.cukashmir.ac.in/#/content;id=CD48FE74-968F-4FB8-BCB7-DBBF608105F9",
  "https://www.cukashmir.ac.in/#/departlist;id=CD48FE74-968F-4FB8-BCB7-DBBF608105F9",
  "https://www.cukashmir.ac.in/#/administration;id=CD48FE74-968F-4FB8-BCB7-DBBF608105F9",
  "https://www.cukashmir.ac.in/#/content;id=FFA215B7-0540-4BA6-A528-7D0C32A79AA0",
  "https://www.cukashmir.ac.in/#/departlist;id=FFA215B7-0540-4BA6-A528-7D0C32A79AA0",
  "https://www.cukashmir.ac.in/#/administration;id=FFA215B7-0540-4BA6-A528-7D0C32A79AA0",
  "https://www.cukashmir.ac.in/#/content;id=18C5CA41-EB58-431F-ABBF-FA7787BB4237",
  "https://www.cukashmir.ac.in/#/departlist;id=18C5CA41-EB58-431F-ABBF-FA7787BB4237",
  "https://www.cukashmir.ac.in/#/administration;id=18C5CA41-EB58-431F-ABBF-FA7787BB4237",
  "https://www.cukashmir.ac.in/#/content;id=714D11EC-60FD-4252-9844-053C5F68BEB2",
  "https://www.cukashmir.ac.in/#/departlist;id=714D11EC-60FD-4252-9844-053C5F68BEB2",
  "https://www.cukashmir.ac.in/#/administration;id=714D11EC-60FD-4252-9844-053C5F68BEB2",
  "https://www.cukashmir.ac.in/#/content;id=B3CC9F50-09A2-4D03-AB9E-6184B40FE707",
  "https://www.cukashmir.ac.in/#/departlist;id=B3CC9F50-09A2-4D03-AB9E-6184B40FE707",
  "https://www.cukashmir.ac.in/#/administration;id=B3CC9F50-09A2-4D03-AB9E-6184B40FE707",
  "https://www.cukashmir.ac.in/#/content;id=DFE368A7-19DB-4E8F-8F01-8057B991626E",
  "https://www.cukashmir.ac.in/#/departlist;id=DFE368A7-19DB-4E8F-8F01-8057B991626E",
  "https://www.cukashmir.ac.in/#/administration;id=DFE368A7-19DB-4E8F-8F01-8057B991626E",
  "https://www.cukashmir.ac.in/#/content;id=27AB8275-28B9-4A52-98C0-CDD21D27CA16",
  "https://www.cukashmir.ac.in/#/departlist;id=27AB8275-28B9-4A52-98C0-CDD21D27CA16",
  "https://www.cukashmir.ac.in/#/administration;id=27AB8275-28B9-4A52-98C0-CDD21D27CA16",
  "https://www.cukashmir.ac.in/#/content;id=BF4D3B56-C4BD-4F31-B0FE-B2A199D7FAC0",
  "https://www.cukashmir.ac.in/#/departlist;id=BF4D3B56-C4BD-4F31-B0FE-B2A199D7FAC0",
  "https://www.cukashmir.ac.in/#/administration;id=BF4D3B56-C4BD-4F31-B0FE-B2A199D7FAC0",
  "https://www.cukashmir.ac.in/#/content;id=7766D350-0935-4EE5-8637-585FDA5A4765",
  "https://www.cukashmir.ac.in/#/departlist;id=7766D350-0935-4EE5-8637-585FDA5A4765",
  "https://www.cukashmir.ac.in/#/administration;id=7766D350-0935-4EE5-8637-585FDA5A4765",
  "https://www.cukashmir.ac.in/#/content;id=2A346406-2713-45E1-A38D-BAFCFDCBFE5C",
  "https://www.cukashmir.ac.in/#/departlist;id=2A346406-2713-45E1-A38D-BAFCFDCBFE5C",
  "https://www.cukashmir.ac.in/#/administration;id=2A346406-2713-45E1-A38D-BAFCFDCBFE5C",
  "https://www.cukashmir.ac.in/#/content;id=C0910A9A-6C21-4CCB-A064-F05661C56BD8",
  "https://www.cukashmir.ac.in/#/departlist;id=C0910A9A-6C21-4CCB-A064-F05661C56BD8",
  "https://www.cukashmir.ac.in/#/administration;id=C0910A9A-6C21-4CCB-A064-F05661C56BD8",
  "https://www.cukashmir.ac.in/#/content;id=6B1D57AB-0D03-4138-9DA6-86EC947B0251",
  "https://www.cukashmir.ac.in/#/departlist;id=6B1D57AB-0D03-4138-9DA6-86EC947B0251",
  "https://www.cukashmir.ac.in/#/administration;id=6B1D57AB-0D03-4138-9DA6-86EC947B0251",
  "https://www.cukashmir.ac.in/#/content;id=1353F142-618A-4D6C-80D2-7BDC7232075C",
  "https://www.cukashmir.ac.in/#/departlist;id=1353F142-618A-4D6C-80D2-7BDC7232075C",
  "https://www.cukashmir.ac.in/#/administration;id=1353F142-618A-4D6C-80D2-7BDC7232075C",
  "https://www.cukashmir.ac.in/#/content;id=AED760BD-36B6-4D11-AC94-44D136088505",
  "https://www.cukashmir.ac.in/#/departlist;id=AED760BD-36B6-4D11-AC94-44D136088505",
  "https://www.cukashmir.ac.in/#/administration;id=AED760BD-36B6-4D11-AC94-44D136088505",
  "https://www.cukashmir.ac.in/#/content;id=37419186-558F-462C-AF2F-C46036A95315",
  "https://www.cukashmir.ac.in/#/departlist;id=37419186-558F-462C-AF2F-C46036A95315",
  "https://www.cukashmir.ac.in/#/administration;id=37419186-558F-462C-AF2F-C46036A95315",
  "https://www.cukashmir.ac.in/#/content;id=F66D34A0-C1FB-41EF-B1DC-12938E0FEEEF",
  "https://www.cukashmir.ac.in/#/departlist;id=F66D34A0-C1FB-41EF-B1DC-12938E0FEEEF",
  "https://www.cukashmir.ac.in/#/administration;id=F66D34A0-C1FB-41EF-B1DC-12938E0FEEEF",
  "https://www.cukashmir.ac.in/#/content;id=FE73586E-1FD9-47BC-B873-0927835CF16E",
  "https://www.cukashmir.ac.in/#/departlist;id=FE73586E-1FD9-47BC-B873-0927835CF16E",
  "https://www.cukashmir.ac.in/#/administration;id=FE73586E-1FD9-47BC-B873-0927835CF16E",
  "https://www.cukashmir.ac.in/#/content;id=848A0717-B41B-457B-BBF7-6231B4C716EE",
  "https://www.cukashmir.ac.in/#/departlist;id=848A0717-B41B-457B-BBF7-6231B4C716EE",
  "https://www.cukashmir.ac.in/#/administration;id=848A0717-B41B-457B-BBF7-6231B4C716EE",
  "https://www.cukashmir.ac.in/#/content;id=397295BC-B6BD-4D3F-8CFF-80A6327410C7",
  "https://www.cukashmir.ac.in/#/departlist;id=397295BC-B6BD-4D3F-8CFF-80A6327410C7",
  "https://www.cukashmir.ac.in/#/administration;id=397295BC-B6BD-4D3F-8CFF-80A6327410C7",
  "https://www.cukashmir.ac.in/#/content;id=B43E066B-1478-41AF-A6F1-9FFD2D7785E9",
  "https://www.cukashmir.ac.in/#/departlist;id=B43E066B-1478-41AF-A6F1-9FFD2D7785E9",
  "https://www.cukashmir.ac.in/#/administration;id=B43E066B-1478-41AF-A6F1-9FFD2D7785E9",
  "https://www.cukashmir.ac.in/#/content;id=EDC30EE7-D2C8-49CB-ADD3-B2DD0ECE8374",
  "https://www.cukashmir.ac.in/#/departlist;id=EDC30EE7-D2C8-49CB-ADD3-B2DD0ECE8374",
  "https://www.cukashmir.ac.in/#/administration;id=EDC30EE7-D2C8-49CB-ADD3-B2DD0ECE8374",
  "https://www.cukashmir.ac.in/#/content;id=B3376572-D3C3-4A54-92A7-6459B1DB47AB",
  "https://www.cukashmir.ac.in/#/departlist;id=B3376572-D3C3-4A54-92A7-6459B1DB47AB",
  "https://www.cukashmir.ac.in/#/administration;id=B3376572-D3C3-4A54-92A7-6459B1DB47AB",
  "https://www.cukashmir.ac.in/#/content;id=F83F94F1-BCC6-4B12-9868-9D9F18B9EC92",
  "https://www.cukashmir.ac.in/#/departlist;id=F83F94F1-BCC6-4B12-9868-9D9F18B9EC92",
  "https://www.cukashmir.ac.in/#/administration;id=F83F94F1-BCC6-4B12-9868-9D9F18B9EC92",
  "https://www.cukashmir.ac.in/#/content;id=E39A4A91-3CB9-42A0-94A5-D10A3BB2591B",
  "https://www.cukashmir.ac.in/#/departlist;id=E39A4A91-3CB9-42A0-94A5-D10A3BB2591B",
  "https://www.cukashmir.ac.in/#/administration;id=E39A4A91-3CB9-42A0-94A5-D10A3BB2591B",
  "https://www.cukashmir.ac.in/#/content;id=4D91F359-2581-4835-ACB8-4A49C1F1043B",
  "https://www.cukashmir.ac.in/#/departlist;id=4D91F359-2581-4835-ACB8-4A49C1F1043B",
  "https://www.cukashmir.ac.in/#/administration;id=4D91F359-2581-4835-ACB8-4A49C1F1043B",
  "https://www.cukashmir.ac.in/#/content;id=957E7C48-3AE9-4841-A063-C5A8E7C520FB",
  "https://www.cukashmir.ac.in/#/departlist;id=957E7C48-3AE9-4841-A063-C5A8E7C520FB",
  "https://www.cukashmir.ac.in/#/administration;id=957E7C48-3AE9-4841-A063-C5A8E7C520FB",
  "https://www.cukashmir.ac.in/#/content;id=12175DF1-71F1-4C60-A7E4-D797F4F75592",
  "https://www.cukashmir.ac.in/#/departlist;id=12175DF1-71F1-4C60-A7E4-D797F4F75592",
  "https://www.cukashmir.ac.in/#/administration;id=12175DF1-71F1-4C60-A7E4-D797F4F75592",
  "https://www.cukashmir.ac.in/#/content;id=BB3180A8-7A80-469B-A3EB-A0C1EFA8A48B",
  "https://www.cukashmir.ac.in/#/departlist;id=BB3180A8-7A80-469B-A3EB-A0C1EFA8A48B",
  "https://www.cukashmir.ac.in/#/administration;id=BB3180A8-7A80-469B-A3EB-A0C1EFA8A48B",
  "https://www.cukashmir.ac.in/#/content;id=75A29354-4795-4B06-8403-C6D2C15AAA24",
  "https://www.cukashmir.ac.in/#/departlist;id=75A29354-4795-4B06-8403-C6D2C15AAA24",
  "https://www.cukashmir.ac.in/#/administration;id=75A29354-4795-4B06-8403-C6D2C15AAA24",
  "https://www.cukashmir.ac.in/#/content;id=A6E59369-541F-46BC-975A-ABAB808D45F6",
  "https://www.cukashmir.ac.in/#/departlist;id=A6E59369-541F-46BC-975A-ABAB808D45F6",
  "https://www.cukashmir.ac.in/#/administration;id=A6E59369-541F-46BC-975A-ABAB808D45F6",
  "https://www.cukashmir.ac.in/#/content;id=4C3AB5BE-1858-46CF-9153-DB20173C3F23",
  "https://www.cukashmir.ac.in/#/departlist;id=4C3AB5BE-1858-46CF-9153-DB20173C3F23",
  "https://www.cukashmir.ac.in/#/administration;id=4C3AB5BE-1858-46CF-9153-DB20173C3F23",
  "https://www.cukashmir.ac.in/#/content;id=75D07499-C6CE-43FA-A64A-5FDD2E6C955E",
  "https://www.cukashmir.ac.in/#/departlist;id=75D07499-C6CE-43FA-A64A-5FDD2E6C955E",
  "https://www.cukashmir.ac.in/#/administration;id=75D07499-C6CE-43FA-A64A-5FDD2E6C955E",
  "https://www.cukashmir.ac.in/#/content;id=EE3A5909-9A2F-4A73-9478-21E379F59D83",
  "https://www.cukashmir.ac.in/#/departlist;id=EE3A5909-9A2F-4A73-9478-21E379F59D83",
  "https://www.cukashmir.ac.in/#/administration;id=EE3A5909-9A2F-4A73-9478-21E379F59D83",
  "https://www.cukashmir.ac.in/#/content;id=99EC1BD5-8BAF-4AE2-970B-B363CB143F27",
  "https://www.cukashmir.ac.in/#/departlist;id=99EC1BD5-8BAF-4AE2-970B-B363CB143F27",
  "https://www.cukashmir.ac.in/#/administration;id=99EC1BD5-8BAF-4AE2-970B-B363CB143F27",
  "https://www.cukashmir.ac.in/#/content;id=41317BCC-0648-43CA-AE97-B4241919A4CD",
  "https://www.cukashmir.ac.in/#/departlist;id=41317BCC-0648-43CA-AE97-B4241919A4CD",
  "https://www.cukashmir.ac.in/#/administration;id=41317BCC-0648-43CA-AE97-B4241919A4CD",
  "https://www.cukashmir.ac.in/#/content;id=CC0EA3ED-031D-4D02-ABB4-A036205D437E",
  "https://www.cukashmir.ac.in/#/departlist;id=CC0EA3ED-031D-4D02-ABB4-A036205D437E",
  "https://www.cukashmir.ac.in/#/administration;id=CC0EA3ED-031D-4D02-ABB4-A036205D437E",
  "https://www.cukashmir.ac.in/#/content;id=0F591CA0-EA77-4EC9-BD3C-DE60A7658B24",
  "https://www.cukashmir.ac.in/#/departlist;id=0F591CA0-EA77-4EC9-BD3C-DE60A7658B24",
  "https://www.cukashmir.ac.in/#/administration;id=0F591CA0-EA77-4EC9-BD3C-DE60A7658B24",
  "https://www.cukashmir.ac.in/#/content;id=AE8755A4-B002-49A7-804D-0143FA8B0DD8",
  "https://www.cukashmir.ac.in/#/departlist;id=AE8755A4-B002-49A7-804D-0143FA8B0DD8",
  "https://www.cukashmir.ac.in/#/administration;id=AE8755A4-B002-49A7-804D-0143FA8B0DD8",
  "https://www.cukashmir.ac.in/#/content;id=FE8A5CF1-BC18-43A5-9238-09A72591E47E",
  "https://www.cukashmir.ac.in/#/departlist;id=FE8A5CF1-BC18-43A5-9238-09A72591E47E",
  "https://www.cukashmir.ac.in/#/administration;id=FE8A5CF1-BC18-43A5-9238-09A72591E47E",
  "https://www.cukashmir.ac.in/#/content;id=CD772C3E-E4EC-45EE-9D11-90152951F99A",
  "https://www.cukashmir.ac.in/#/departlist;id=CD772C3E-E4EC-45EE-9D11-90152951F99A",
  "https://www.cukashmir.ac.in/#/administration;id=CD772C3E-E4EC-45EE-9D11-90152951F99A",
  "https://www.cukashmir.ac.in/#/content;id=55D3E87E-B5AC-43A4-98F6-B824F2233ACF",
  "https://www.cukashmir.ac.in/#/departlist;id=55D3E87E-B5AC-43A4-98F6-B824F2233ACF",
  "https://www.cukashmir.ac.in/#/administration;id=55D3E87E-B5AC-43A4-98F6-B824F2233ACF",
  "https://www.cukashmir.ac.in/#/content;id=4D1A3EA2-62CE-4B5F-A0BD-3A2F094E51C9",
  "https://www.cukashmir.ac.in/#/departlist;id=4D1A3EA2-62CE-4B5F-A0BD-3A2F094E51C9",
  "https://www.cukashmir.ac.in/#/administration;id=4D1A3EA2-62CE-4B5F-A0BD-3A2F094E51C9",
  "https://www.cukashmir.ac.in/#/content;id=F5A86348-269C-47AF-B6BC-9042E4C53964",
  "https://www.cukashmir.ac.in/#/departlist;id=F5A86348-269C-47AF-B6BC-9042E4C53964",
  "https://www.cukashmir.ac.in/#/administration;id=F5A86348-269C-47AF-B6BC-9042E4C53964",
  "https://www.cukashmir.ac.in/#/content;id=6844CFF3-844B-4439-B163-AC3BF13856D6",
  "https://www.cukashmir.ac.in/#/departlist;id=6844CFF3-844B-4439-B163-AC3BF13856D6",
  "https://www.cukashmir.ac.in/#/administration;id=6844CFF3-844B-4439-B163-AC3BF13856D6",
  "https://www.cukashmir.ac.in/#/content;id=64ca0d34f2ee76a7c15ee8f22e205fc4aeed",
  "https://www.cukashmir.ac.in/#/departlist;id=64ca0d34f2ee76a7c15ee8f22e205fc4aeed",
  "https://www.cukashmir.ac.in/#/administration;id=64ca0d34f2ee76a7c15ee8f22e205fc4aeed",
  "https://www.cukashmir.ac.in/#/content;id=528A10BD-554A-4147-BB81-FB728523A8D0",
  "https://www.cukashmir.ac.in/#/departlist;id=528A10BD-554A-4147-BB81-FB728523A8D0",
  "https://www.cukashmir.ac.in/#/administration;id=528A10BD-554A-4147-BB81-FB728523A8D0",
  "https://www.cukashmir.ac.in/#/content;id=E9A7A793-DF0B-4545-97FA-A582C956698B",
  "https://www.cukashmir.ac.in/#/departlist;id=E9A7A793-DF0B-4545-97FA-A582C956698B",
  "https://www.cukashmir.ac.in/#/administration;id=E9A7A793-DF0B-4545-97FA-A582C956698B",
  "https://www.cukashmir.ac.in/#/content;id=46803C19-BD33-418A-AD6F-F11A10055C12",
  "https://www.cukashmir.ac.in/#/departlist;id=46803C19-BD33-418A-AD6F-F11A10055C12",
  "https://www.cukashmir.ac.in/#/administration;id=46803C19-BD33-418A-AD6F-F11A10055C12",
  "https://www.cukashmir.ac.in/#/content;id=88E84BA4-C444-4DF5-8A75-1988E12320FC",
  "https://www.cukashmir.ac.in/#/departlist;id=88E84BA4-C444-4DF5-8A75-1988E12320FC",
  "https://www.cukashmir.ac.in/#/administration;id=88E84BA4-C444-4DF5-8A75-1988E12320FC",
  "https://www.cukashmir.ac.in/#/content;id=2F97B501-1C0A-4754-A7E7-AB0309B28E8E",
  "https://www.cukashmir.ac.in/#/departlist;id=2F97B501-1C0A-4754-A7E7-AB0309B28E8E",
  "https://www.cukashmir.ac.in/#/administration;id=2F97B501-1C0A-4754-A7E7-AB0309B28E8E",
  "https://www.cukashmir.ac.in/#/content;id=7A796BB7-9E90-4304-8F8F-ADD57D352D49",
  "https://www.cukashmir.ac.in/#/departlist;id=7A796BB7-9E90-4304-8F8F-ADD57D352D49",
  "https://www.cukashmir.ac.in/#/administration;id=7A796BB7-9E90-4304-8F8F-ADD57D352D49",
  "https://www.cukashmir.ac.in/#/content;id=950BF26A-C43C-4CCF-B2D5-EBB7FDECFB0D",
  "https://www.cukashmir.ac.in/#/departlist;id=950BF26A-C43C-4CCF-B2D5-EBB7FDECFB0D",
  "https://www.cukashmir.ac.in/#/administration;id=950BF26A-C43C-4CCF-B2D5-EBB7FDECFB0D",
  "https://www.cukashmir.ac.in/#/content;id=A0599619-F945-4898-A81C-B0FBB3AD4083",
  "https://www.cukashmir.ac.in/#/departlist;id=A0599619-F945-4898-A81C-B0FBB3AD4083",
  "https://www.cukashmir.ac.in/#/administration;id=A0599619-F945-4898-A81C-B0FBB3AD4083",
  "https://www.cukashmir.ac.in/#/content;id=D8DFA3EA-30E3-4D5D-9D25-21550F474EC3",
  "https://www.cukashmir.ac.in/#/departlist;id=D8DFA3EA-30E3-4D5D-9D25-21550F474EC3",
  "https://www.cukashmir.ac.in/#/administration;id=D8DFA3EA-30E3-4D5D-9D25-21550F474EC3",
  "https://www.cukashmir.ac.in/#/content;id=DF9C2D1B-D328-4162-9037-F49BD49429C5",
  "https://www.cukashmir.ac.in/#/departlist;id=DF9C2D1B-D328-4162-9037-F49BD49429C5",
  "https://www.cukashmir.ac.in/#/administration;id=DF9C2D1B-D328-4162-9037-F49BD49429C5",
  "https://www.cukashmir.ac.in/#/content;id=AD610CB2-C199-4AE6-A787-309E463B1F42",
  "https://www.cukashmir.ac.in/#/departlist;id=AD610CB2-C199-4AE6-A787-309E463B1F42",
  "https://www.cukashmir.ac.in/#/administration;id=AD610CB2-C199-4AE6-A787-309E463B1F42",
  "https://www.cukashmir.ac.in/#/content;id=93CD984A-C791-441D-9CA6-5AD0F4070E7D",
  "https://www.cukashmir.ac.in/#/departlist;id=93CD984A-C791-441D-9CA6-5AD0F4070E7D",
  "https://www.cukashmir.ac.in/#/administration;id=93CD984A-C791-441D-9CA6-5AD0F4070E7D",
  "https://www.cukashmir.ac.in/#/content;id=7F4BEE3F-F520-4345-B890-42D1DE69B79B",
  "https://www.cukashmir.ac.in/#/departlist;id=7F4BEE3F-F520-4345-B890-42D1DE69B79B",
  "https://www.cukashmir.ac.in/#/administration;id=7F4BEE3F-F520-4345-B890-42D1DE69B79B",
  "https://www.cukashmir.ac.in/#/content;id=78870074-C1B6-43AE-A6D4-FC200A0E5AFE",
  "https://www.cukashmir.ac.in/#/departlist;id=78870074-C1B6-43AE-A6D4-FC200A0E5AFE",
  "https://www.cukashmir.ac.in/#/administration;id=78870074-C1B6-43AE-A6D4-FC200A0E5AFE",
  "https://www.cukashmir.ac.in/#/content;id=5883EA47-32A9-4C0A-945B-74EED1259C52",
  "https://www.cukashmir.ac.in/#/departlist;id=5883EA47-32A9-4C0A-945B-74EED1259C52",
  "https://www.cukashmir.ac.in/#/administration;id=5883EA47-32A9-4C0A-945B-74EED1259C52",
  "https://www.cukashmir.ac.in/#/content;id=47FBF8A2-6FFB-4537-8167-4C5A9D170CA3",
  "https://www.cukashmir.ac.in/#/departlist;id=47FBF8A2-6FFB-4537-8167-4C5A9D170CA3",
  "https://www.cukashmir.ac.in/#/administration;id=47FBF8A2-6FFB-4537-8167-4C5A9D170CA3",
  "https://www.cukashmir.ac.in/#/content;id=C006EC07-25D3-4698-A16E-D019C087E648",
  "https://www.cukashmir.ac.in/#/departlist;id=C006EC07-25D3-4698-A16E-D019C087E648",
  "https://www.cukashmir.ac.in/#/administration;id=C006EC07-25D3-4698-A16E-D019C087E648",
  "https://www.cukashmir.ac.in/#/content;id=11B01C21-B10F-4DDA-A057-EDCB3711706D",
  "https://www.cukashmir.ac.in/#/departlist;id=11B01C21-B10F-4DDA-A057-EDCB3711706D",
  "https://www.cukashmir.ac.in/#/administration;id=11B01C21-B10F-4DDA-A057-EDCB3711706D",
  "https://www.cukashmir.ac.in/#/content;id=6B66D329-ABEB-4E2C-9EE1-CB9636AD5A6C",
  "https://www.cukashmir.ac.in/#/departlist;id=6B66D329-ABEB-4E2C-9EE1-CB9636AD5A6C",
  "https://www.cukashmir.ac.in/#/administration;id=6B66D329-ABEB-4E2C-9EE1-CB9636AD5A6C",
  "https://www.cukashmir.ac.in/#/content;id=AA30CD51-8836-4413-ACAB-3ABBA1CDDD5F",
  "https://www.cukashmir.ac.in/#/departlist;id=AA30CD51-8836-4413-ACAB-3ABBA1CDDD5F",
  "https://www.cukashmir.ac.in/#/administration;id=AA30CD51-8836-4413-ACAB-3ABBA1CDDD5F",
  "https://www.cukashmir.ac.in/#/content;id=D67E96EC-D44E-42C1-AE6A-CE78C2D292C3",
  "https://www.cukashmir.ac.in/#/departlist;id=D67E96EC-D44E-42C1-AE6A-CE78C2D292C3",
  "https://www.cukashmir.ac.in/#/administration;id=D67E96EC-D44E-42C1-AE6A-CE78C2D292C3",
  "https://www.cukashmir.ac.in/#/content;id=B58D1329-F8BF-40BE-BDE5-B8E9B73FE7ED",
  "https://www.cukashmir.ac.in/#/departlist;id=B58D1329-F8BF-40BE-BDE5-B8E9B73FE7ED",
  "https://www.cukashmir.ac.in/#/administration;id=B58D1329-F8BF-40BE-BDE5-B8E9B73FE7ED",
  "https://www.cukashmir.ac.in/#/content;id=AA3B9E30-C8C7-4DA8-BE8D-4F6FC10DC2AF",
  "https://www.cukashmir.ac.in/#/departlist;id=AA3B9E30-C8C7-4DA8-BE8D-4F6FC10DC2AF",
  "https://www.cukashmir.ac.in/#/administration;id=AA3B9E30-C8C7-4DA8-BE8D-4F6FC10DC2AF",
  "https://www.cukashmir.ac.in/#/content;id=A35681D5-D663-4872-9BA6-B52F9763437C",
  "https://www.cukashmir.ac.in/#/departlist;id=A35681D5-D663-4872-9BA6-B52F9763437C",
  "https://www.cukashmir.ac.in/#/administration;id=A35681D5-D663-4872-9BA6-B52F9763437C",
  "https://www.cukashmir.ac.in/#/content;id=599485EF-DF0E-4834-B11B-828A0CD2450D",
  "https://www.cukashmir.ac.in/#/departlist;id=599485EF-DF0E-4834-B11B-828A0CD2450D",
  "https://www.cukashmir.ac.in/#/administration;id=599485EF-DF0E-4834-B11B-828A0CD2450D",
  "https://www.cukashmir.ac.in/#/content;id=4A10B1AA-BDCD-49E7-824D-8B8645A13BE2",
  "https://www.cukashmir.ac.in/#/departlist;id=4A10B1AA-BDCD-49E7-824D-8B8645A13BE2",
  "https://www.cukashmir.ac.in/#/administration;id=4A10B1AA-BDCD-49E7-824D-8B8645A13BE2",
  "https://www.cukashmir.ac.in/#/content;id=BBBAF404-6D56-40C1-B0C1-47D8266F91D8",
  "https://www.cukashmir.ac.in/#/departlist;id=BBBAF404-6D56-40C1-B0C1-47D8266F91D8",
  "https://www.cukashmir.ac.in/#/administration;id=BBBAF404-6D56-40C1-B0C1-47D8266F91D8",
  "https://www.cukashmir.ac.in/#/content;id=24B90340-245F-4F7D-90B0-6101F551E5F1",
  "https://www.cukashmir.ac.in/#/departlist;id=24B90340-245F-4F7D-90B0-6101F551E5F1",
  "https://www.cukashmir.ac.in/#/administration;id=24B90340-245F-4F7D-90B0-6101F551E5F1",
  "https://www.cukashmir.ac.in/#/content;id=4134F7F3-D4C9-4273-9225-E9D827635C02",
  "https://www.cukashmir.ac.in/#/departlist;id=4134F7F3-D4C9-4273-9225-E9D827635C02",
  "https://www.cukashmir.ac.in/#/administration;id=4134F7F3-D4C9-4273-9225-E9D827635C02",
  "https://www.cukashmir.ac.in/#/content;id=E959DF0C-EAE9-476B-B12D-9D62009DA9C6",
  "https://www.cukashmir.ac.in/#/departlist;id=E959DF0C-EAE9-476B-B12D-9D62009DA9C6",
  "https://www.cukashmir.ac.in/#/administration;id=E959DF0C-EAE9-476B-B12D-9D62009DA9C6",
  "https://www.cukashmir.ac.in/#/content;id=C13555D8-E04A-4D37-ACE8-936348597FE0",
  "https://www.cukashmir.ac.in/#/departlist;id=C13555D8-E04A-4D37-ACE8-936348597FE0",
  "https://www.cukashmir.ac.in/#/administration;id=C13555D8-E04A-4D37-ACE8-936348597FE0",
  "https://www.cukashmir.ac.in/#/content;id=6D65C972-F603-4271-BAE5-B74F570E3862",
  "https://www.cukashmir.ac.in/#/departlist;id=6D65C972-F603-4271-BAE5-B74F570E3862",
  "https://www.cukashmir.ac.in/#/administration;id=6D65C972-F603-4271-BAE5-B74F570E3862",
  "https://www.cukashmir.ac.in/#/content;id=E8F16280-3587-4CDA-8A18-93C52C08366E",
  "https://www.cukashmir.ac.in/#/departlist;id=E8F16280-3587-4CDA-8A18-93C52C08366E",
  "https://www.cukashmir.ac.in/#/administration;id=E8F16280-3587-4CDA-8A18-93C52C08366E",
  "https://www.cukashmir.ac.in/#/content;id=C6C5ACC4-B4B7-4AEF-8C7C-AA28199D87A9",
  "https://www.cukashmir.ac.in/#/departlist;id=C6C5ACC4-B4B7-4AEF-8C7C-AA28199D87A9",
  "https://www.cukashmir.ac.in/#/administration;id=C6C5ACC4-B4B7-4AEF-8C7C-AA28199D87A9",
  "https://www.cukashmir.ac.in/#/content;id=17E2C43C-2E4E-4FC7-ADE3-E29F69E8C662",
  "https://www.cukashmir.ac.in/#/departlist;id=17E2C43C-2E4E-4FC7-ADE3-E29F69E8C662",
  "https://www.cukashmir.ac.in/#/administration;id=17E2C43C-2E4E-4FC7-ADE3-E29F69E8C662",
  "https://www.cukashmir.ac.in/#/content;id=8B47D38A-E681-4D7E-8C76-D05C0A7A0244",
  "https://www.cukashmir.ac.in/#/departlist;id=8B47D38A-E681-4D7E-8C76-D05C0A7A0244",
  "https://www.cukashmir.ac.in/#/administration;id=8B47D38A-E681-4D7E-8C76-D05C0A7A0244",
  "https://www.cukashmir.ac.in/#/content;id=DE79591B-18FF-4AEA-8DA5-60A54D1BAA4D",
  "https://www.cukashmir.ac.in/#/departlist;id=DE79591B-18FF-4AEA-8DA5-60A54D1BAA4D",
  "https://www.cukashmir.ac.in/#/administration;id=DE79591B-18FF-4AEA-8DA5-60A54D1BAA4D",
  "https://www.cukashmir.ac.in/#/content;id=2B89B6B7-3BB2-4814-B9EB-A291F0CE88C0",
  "https://www.cukashmir.ac.in/#/departlist;id=2B89B6B7-3BB2-4814-B9EB-A291F0CE88C0",
  "https://www.cukashmir.ac.in/#/administration;id=2B89B6B7-3BB2-4814-B9EB-A291F0CE88C0",
  "https://www.cukashmir.ac.in/#/content;id=A8580C8A-D891-4E93-86BA-8D4E626F0415",
  "https://www.cukashmir.ac.in/#/departlist;id=A8580C8A-D891-4E93-86BA-8D4E626F0415",
  "https://www.cukashmir.ac.in/#/administration;id=A8580C8A-D891-4E93-86BA-8D4E626F0415",
  "https://www.cukashmir.ac.in/#/content;id=2654C09D-2C16-45BE-9013-8CA806D3E35A",
  "https://www.cukashmir.ac.in/#/departlist;id=2654C09D-2C16-45BE-9013-8CA806D3E35A",
  "https://www.cukashmir.ac.in/#/administration;id=2654C09D-2C16-45BE-9013-8CA806D3E35A",
  "https://www.cukashmir.ac.in/#/content;id=869AD373-F150-4547-BC16-D7131B76852D",
  "https://www.cukashmir.ac.in/#/departlist;id=869AD373-F150-4547-BC16-D7131B76852D",
  "https://www.cukashmir.ac.in/#/administration;id=869AD373-F150-4547-BC16-D7131B76852D",
  "https://www.cukashmir.ac.in/#/content;id=0F2763CA-D1FF-4A7F-B7EB-B1D5C1C6057D",
  "https://www.cukashmir.ac.in/#/departlist;id=0F2763CA-D1FF-4A7F-B7EB-B1D5C1C6057D",
  "https://www.cukashmir.ac.in/#/administration;id=0F2763CA-D1FF-4A7F-B7EB-B1D5C1C6057D",
  "https://www.cukashmir.ac.in/#/content;id=A3A2F4DB-0138-488D-B668-E09CAD205746",
  "https://www.cukashmir.ac.in/#/departlist;id=A3A2F4DB-0138-488D-B668-E09CAD205746",
  "https://www.cukashmir.ac.in/#/administration;id=A3A2F4DB-0138-488D-B668-E09CAD205746",
  "https://www.cukashmir.ac.in/#/content;id=148B93D4-8BDC-47A2-AD7A-7DD50D670469",
  "https://www.cukashmir.ac.in/#/departlist;id=148B93D4-8BDC-47A2-AD7A-7DD50D670469",
  "https://www.cukashmir.ac.in/#/administration;id=148B93D4-8BDC-47A2-AD7A-7DD50D670469",
  "https://www.cukashmir.ac.in/#/content;id=88DD9308-0314-4B2D-AEFE-1E3595237609",
  "https://www.cukashmir.ac.in/#/departlist;id=88DD9308-0314-4B2D-AEFE-1E3595237609",
  "https://www.cukashmir.ac.in/#/administration;id=88DD9308-0314-4B2D-AEFE-1E3595237609",
  "https://www.cukashmir.ac.in/#/content;id=B9466938-CB12-41D4-B95E-7E93EE5093C3",
  "https://www.cukashmir.ac.in/#/departlist;id=B9466938-CB12-41D4-B95E-7E93EE5093C3",
  "https://www.cukashmir.ac.in/#/administration;id=B9466938-CB12-41D4-B95E-7E93EE5093C3",
  "https://www.cukashmir.ac.in/#/content;id=69FEDFE9-D264-4856-A47A-7051832B1C9A",
  "https://www.cukashmir.ac.in/#/departlist;id=69FEDFE9-D264-4856-A47A-7051832B1C9A",
  "https://www.cukashmir.ac.in/#/administration;id=69FEDFE9-D264-4856-A47A-7051832B1C9A",
  "https://www.cukashmir.ac.in/#/content;id=9686461A-FB8F-437E-BB11-660094E21235",
  "https://www.cukashmir.ac.in/#/departlist;id=9686461A-FB8F-437E-BB11-660094E21235",
  "https://www.cukashmir.ac.in/#/administration;id=9686461A-FB8F-437E-BB11-660094E21235",
  "https://www.cukashmir.ac.in/#/content;id=2686A3CA-4CF0-40E6-9CB1-CCAF25D3A63C",
  "https://www.cukashmir.ac.in/#/departlist;id=2686A3CA-4CF0-40E6-9CB1-CCAF25D3A63C",
  "https://www.cukashmir.ac.in/#/administration;id=2686A3CA-4CF0-40E6-9CB1-CCAF25D3A63C",
  "https://www.cukashmir.ac.in/#/content;id=A66004B1-CADE-4307-ACE6-F3F619C11F09",
  "https://www.cukashmir.ac.in/#/departlist;id=A66004B1-CADE-4307-ACE6-F3F619C11F09",
  "https://www.cukashmir.ac.in/#/administration;id=A66004B1-CADE-4307-ACE6-F3F619C11F09",
  "https://www.cukashmir.ac.in/#/content;id=630E2B7B-BDAF-4676-87FA-68975FA7D58A",
  "https://www.cukashmir.ac.in/#/departlist;id=630E2B7B-BDAF-4676-87FA-68975FA7D58A",
  "https://www.cukashmir.ac.in/#/administration;id=630E2B7B-BDAF-4676-87FA-68975FA7D58A",
  "https://www.cukashmir.ac.in/#/content;id=1E072D35-0A5E-485D-9945-BCC8BD7D2E0A",
  "https://www.cukashmir.ac.in/#/departlist;id=1E072D35-0A5E-485D-9945-BCC8BD7D2E0A",
  "https://www.cukashmir.ac.in/#/administration;id=1E072D35-0A5E-485D-9945-BCC8BD7D2E0A",
  "https://www.cukashmir.ac.in/#/content;id=EE1BC2E8-B613-45E2-B701-EB4FC301C487",
  "https://www.cukashmir.ac.in/#/departlist;id=EE1BC2E8-B613-45E2-B701-EB4FC301C487",
  "https://www.cukashmir.ac.in/#/administration;id=EE1BC2E8-B613-45E2-B701-EB4FC301C487",
  "https://www.cukashmir.ac.in/#/content;id=2F39DC8A-3E31-42CE-BBEC-1C5C6D61AE15",
  "https://www.cukashmir.ac.in/#/departlist;id=2F39DC8A-3E31-42CE-BBEC-1C5C6D61AE15",
  "https://www.cukashmir.ac.in/#/administration;id=2F39DC8A-3E31-42CE-BBEC-1C5C6D61AE15",
  "https://www.cukashmir.ac.in/#/content;id=BCC4D0D6-5AC5-4E60-A9B5-4C81FD0D433E",
  "https://www.cukashmir.ac.in/#/departlist;id=BCC4D0D6-5AC5-4E60-A9B5-4C81FD0D433E",
  "https://www.cukashmir.ac.in/#/administration;id=BCC4D0D6-5AC5-4E60-A9B5-4C81FD0D433E",
  "https://www.cukashmir.ac.in/#/content;id=620EA9FE-C991-4D31-9A7E-DF2C0747B0A1",
  "https://www.cukashmir.ac.in/#/departlist;id=620EA9FE-C991-4D31-9A7E-DF2C0747B0A1",
  "https://www.cukashmir.ac.in/#/administration;id=620EA9FE-C991-4D31-9A7E-DF2C0747B0A1",
  "https://www.cukashmir.ac.in/#/content;id=EBFC57CA-1FAA-444C-9A4C-CB18004CC677",
  "https://www.cukashmir.ac.in/#/departlist;id=EBFC57CA-1FAA-444C-9A4C-CB18004CC677",
  "https://www.cukashmir.ac.in/#/administration;id=EBFC57CA-1FAA-444C-9A4C-CB18004CC677",
  "https://www.cukashmir.ac.in/#/content;id=C10BF1C0-EDE2-43E2-8229-C230F92A54EB",
  "https://www.cukashmir.ac.in/#/departlist;id=C10BF1C0-EDE2-43E2-8229-C230F92A54EB",
  "https://www.cukashmir.ac.in/#/administration;id=C10BF1C0-EDE2-43E2-8229-C230F92A54EB",
  "https://www.cukashmir.ac.in/#/content;id=D3931129-9669-4905-A660-FD1F71987CAD",
  "https://www.cukashmir.ac.in/#/departlist;id=D3931129-9669-4905-A660-FD1F71987CAD",
  "https://www.cukashmir.ac.in/#/administration;id=D3931129-9669-4905-A660-FD1F71987CAD",
  "https://www.cukashmir.ac.in/#/content;id=0730F08B-F7D5-495B-853A-23A1599F8E68",
  "https://www.cukashmir.ac.in/#/departlist;id=0730F08B-F7D5-495B-853A-23A1599F8E68",
  "https://www.cukashmir.ac.in/#/administration;id=0730F08B-F7D5-495B-853A-23A1599F8E68",
  "https://www.cukashmir.ac.in/#/content;id=9710BC3C-6122-4BD2-8142-747A52A62D3B",
  "https://www.cukashmir.ac.in/#/departlist;id=9710BC3C-6122-4BD2-8142-747A52A62D3B",
  "https://www.cukashmir.ac.in/#/administration;id=9710BC3C-6122-4BD2-8142-747A52A62D3B",
  "https://www.cukashmir.ac.in/#/content;id=318D3287-F701-4F9E-ADDA-1C8A71F31DA0",
  "https://www.cukashmir.ac.in/#/departlist;id=318D3287-F701-4F9E-ADDA-1C8A71F31DA0",
  "https://www.cukashmir.ac.in/#/administration;id=318D3287-F701-4F9E-ADDA-1C8A71F31DA0",
  "https://www.cukashmir.ac.in/#/content;id=96443AFC-1378-4481-AFF2-9C04B3F6DA84",
  "https://www.cukashmir.ac.in/#/departlist;id=96443AFC-1378-4481-AFF2-9C04B3F6DA84",
  "https://www.cukashmir.ac.in/#/administration;id=96443AFC-1378-4481-AFF2-9C04B3F6DA84",
  "https://www.cukashmir.ac.in/#/content;id=9E212B28-2030-4F7A-96BC-6700E104CC05",
  "https://www.cukashmir.ac.in/#/departlist;id=9E212B28-2030-4F7A-96BC-6700E104CC05",
  "https://www.cukashmir.ac.in/#/administration;id=9E212B28-2030-4F7A-96BC-6700E104CC05",
  "https://www.cukashmir.ac.in/#/content;id=DC60B0B2-24E8-433D-B1C7-43DE2FEB9C40",
  "https://www.cukashmir.ac.in/#/departlist;id=DC60B0B2-24E8-433D-B1C7-43DE2FEB9C40",
  "https://www.cukashmir.ac.in/#/administration;id=DC60B0B2-24E8-433D-B1C7-43DE2FEB9C40",
  "https://www.cukashmir.ac.in/#/content;id=3C66A7A5-D1A2-400E-994A-649FCF16BE58",
  "https://www.cukashmir.ac.in/#/departlist;id=3C66A7A5-D1A2-400E-994A-649FCF16BE58",
  "https://www.cukashmir.ac.in/#/administration;id=3C66A7A5-D1A2-400E-994A-649FCF16BE58",
  "https://www.cukashmir.ac.in/#/content;id=7A71B4D9-9947-484C-B062-772D26445060",
  "https://www.cukashmir.ac.in/#/departlist;id=7A71B4D9-9947-484C-B062-772D26445060",
  "https://www.cukashmir.ac.in/#/administration;id=7A71B4D9-9947-484C-B062-772D26445060",
  "https://www.cukashmir.ac.in/#/content;id=8CB481B2-3965-4793-A468-2D690B395547",
  "https://www.cukashmir.ac.in/#/departlist;id=8CB481B2-3965-4793-A468-2D690B395547",
  "https://www.cukashmir.ac.in/#/administration;id=8CB481B2-3965-4793-A468-2D690B395547",
  "https://www.cukashmir.ac.in/#/content;id=45292C9B-44A7-4ACC-B016-303067A247CA",
  "https://www.cukashmir.ac.in/#/departlist;id=45292C9B-44A7-4ACC-B016-303067A247CA",
  "https://www.cukashmir.ac.in/#/administration;id=45292C9B-44A7-4ACC-B016-303067A247CA",
  "https://www.cukashmir.ac.in/#/content;id=E23566FA-569B-4547-BEC2-7148CC73DB93",
  "https://www.cukashmir.ac.in/#/departlist;id=E23566FA-569B-4547-BEC2-7148CC73DB93",
  "https://www.cukashmir.ac.in/#/administration;id=E23566FA-569B-4547-BEC2-7148CC73DB93",
  "https://www.cukashmir.ac.in/#/content;id=8184782B-F365-4C97-B951-B9797209969F",
  "https://www.cukashmir.ac.in/#/departlist;id=8184782B-F365-4C97-B951-B9797209969F",
  "https://www.cukashmir.ac.in/#/administration;id=8184782B-F365-4C97-B951-B9797209969F",
  "https://www.cukashmir.ac.in/#/content;id=F5D94897-3285-4B34-BF1E-F66481867A5F",
  "https://www.cukashmir.ac.in/#/departlist;id=F5D94897-3285-4B34-BF1E-F66481867A5F",
  "https://www.cukashmir.ac.in/#/administration;id=F5D94897-3285-4B34-BF1E-F66481867A5F",
  "https://www.cukashmir.ac.in/#/content;id=BB5D2033-549B-41F5-9C28-C1673FE7130F",
  "https://www.cukashmir.ac.in/#/departlist;id=BB5D2033-549B-41F5-9C28-C1673FE7130F",
  "https://www.cukashmir.ac.in/#/administration;id=BB5D2033-549B-41F5-9C28-C1673FE7130F",
  "https://www.cukashmir.ac.in/#/content;id=6534862E-E76C-45B0-8A81-2D4D4B01C898",
  "https://www.cukashmir.ac.in/#/departlist;id=6534862E-E76C-45B0-8A81-2D4D4B01C898",
  "https://www.cukashmir.ac.in/#/administration;id=6534862E-E76C-45B0-8A81-2D4D4B01C898",
  "https://www.cukashmir.ac.in/#/content;id=AF228133-B304-432D-AFB9-CF0440BB7BC1",
  "https://www.cukashmir.ac.in/#/departlist;id=AF228133-B304-432D-AFB9-CF0440BB7BC1",
  "https://www.cukashmir.ac.in/#/administration;id=AF228133-B304-432D-AFB9-CF0440BB7BC1",
  "https://www.cukashmir.ac.in/#/content;id=527F158B-7520-40E4-800D-B0EBCA4BF30D",
  "https://www.cukashmir.ac.in/#/departlist;id=527F158B-7520-40E4-800D-B0EBCA4BF30D",
  "https://www.cukashmir.ac.in/#/administration;id=527F158B-7520-40E4-800D-B0EBCA4BF30D",
  "https://www.cukashmir.ac.in/#/content;id=10A495A4-67DE-4441-B01B-BA9503471C4A",
  "https://www.cukashmir.ac.in/#/departlist;id=10A495A4-67DE-4441-B01B-BA9503471C4A",
  "https://www.cukashmir.ac.in/#/administration;id=10A495A4-67DE-4441-B01B-BA9503471C4A",
  "https://www.cukashmir.ac.in/#/content;id=F1A50480-BCE9-414E-842D-62F4477E1638",
  "https://www.cukashmir.ac.in/#/departlist;id=F1A50480-BCE9-414E-842D-62F4477E1638",
  "https://www.cukashmir.ac.in/#/administration;id=F1A50480-BCE9-414E-842D-62F4477E1638",
  "https://www.cukashmir.ac.in/#/content;id=8E3030B2-A757-4E57-8F0C-641A7583046F",
  "https://www.cukashmir.ac.in/#/departlist;id=8E3030B2-A757-4E57-8F0C-641A7583046F",
  "https://www.cukashmir.ac.in/#/administration;id=8E3030B2-A757-4E57-8F0C-641A7583046F",
  "https://www.cukashmir.ac.in/#/content;id=CCD4FDF2-72CE-4493-87D5-52CDE5DDE24A",
  "https://www.cukashmir.ac.in/#/departlist;id=CCD4FDF2-72CE-4493-87D5-52CDE5DDE24A",
  "https://www.cukashmir.ac.in/#/administration;id=CCD4FDF2-72CE-4493-87D5-52CDE5DDE24A",
  "https://www.cukashmir.ac.in/#/content;id=A9DD2CAF-21A6-4CC9-BA02-EAE344EC7E99",
  "https://www.cukashmir.ac.in/#/departlist;id=A9DD2CAF-21A6-4CC9-BA02-EAE344EC7E99",
  "https://www.cukashmir.ac.in/#/administration;id=A9DD2CAF-21A6-4CC9-BA02-EAE344EC7E99",
  "https://www.cukashmir.ac.in/#/content;id=7966B123-9145-4BA6-A98B-8F18C9A273AB",
  "https://www.cukashmir.ac.in/#/departlist;id=7966B123-9145-4BA6-A98B-8F18C9A273AB",
  "https://www.cukashmir.ac.in/#/administration;id=7966B123-9145-4BA6-A98B-8F18C9A273AB",
  "https://www.cukashmir.ac.in/#/content;id=85E2FC7C-BC02-4E6F-BCD7-31AB819FD48F",
  "https://www.cukashmir.ac.in/#/departlist;id=85E2FC7C-BC02-4E6F-BCD7-31AB819FD48F",
  "https://www.cukashmir.ac.in/#/administration;id=85E2FC7C-BC02-4E6F-BCD7-31AB819FD48F",
  "https://www.cukashmir.ac.in/#/content;id=903E24E0-3B48-4B0B-B6E7-A6E7FBEAC9CA",
  "https://www.cukashmir.ac.in/#/departlist;id=903E24E0-3B48-4B0B-B6E7-A6E7FBEAC9CA",
  "https://www.cukashmir.ac.in/#/administration;id=903E24E0-3B48-4B0B-B6E7-A6E7FBEAC9CA",
  "https://www.cukashmir.ac.in/#/content;id=409958B0-949C-404C-ACBA-9F2BD0DFA946",
  "https://www.cukashmir.ac.in/#/departlist;id=409958B0-949C-404C-ACBA-9F2BD0DFA946",
  "https://www.cukashmir.ac.in/#/administration;id=409958B0-949C-404C-ACBA-9F2BD0DFA946",
  "https://www.cukashmir.ac.in/#/content;id=5CDD8054-3522-49A1-B10F-ECC33C9F7214",
  "https://www.cukashmir.ac.in/#/departlist;id=5CDD8054-3522-49A1-B10F-ECC33C9F7214",
  "https://www.cukashmir.ac.in/#/administration;id=5CDD8054-3522-49A1-B10F-ECC33C9F7214",
  "https://www.cukashmir.ac.in/#/content;id=155A459D-91EF-4211-9811-BC337CA68466",
  "https://www.cukashmir.ac.in/#/departlist;id=155A459D-91EF-4211-9811-BC337CA68466",
  "https://www.cukashmir.ac.in/#/administration;id=155A459D-91EF-4211-9811-BC337CA68466",
  "https://www.cukashmir.ac.in/#/content;id=D90B32EA-E3C4-47ED-AF84-3FADCBA3840A",
  "https://www.cukashmir.ac.in/#/departlist;id=D90B32EA-E3C4-47ED-AF84-3FADCBA3840A",
  "https://www.cukashmir.ac.in/#/administration;id=D90B32EA-E3C4-47ED-AF84-3FADCBA3840A",
  "https://www.cukashmir.ac.in/#/content;id=51B4389C-5A10-4706-82AE-112C4AFD76EC",
  "https://www.cukashmir.ac.in/#/departlist;id=51B4389C-5A10-4706-82AE-112C4AFD76EC",
  "https://www.cukashmir.ac.in/#/administration;id=51B4389C-5A10-4706-82AE-112C4AFD76EC",
  "https://www.cukashmir.ac.in/#/content;id=CD224746-F07E-4C03-A900-09E3E7CFB454",
  "https://www.cukashmir.ac.in/#/departlist;id=CD224746-F07E-4C03-A900-09E3E7CFB454",
  "https://www.cukashmir.ac.in/#/administration;id=CD224746-F07E-4C03-A900-09E3E7CFB454",
  "https://www.cukashmir.ac.in/#/content;id=B0E02A69-E236-4208-800D-2C76814AB215",
  "https://www.cukashmir.ac.in/#/departlist;id=B0E02A69-E236-4208-800D-2C76814AB215",
  "https://www.cukashmir.ac.in/#/administration;id=B0E02A69-E236-4208-800D-2C76814AB215",
  "https://www.cukashmir.ac.in/#/content;id=E9C19745-6913-4E8A-AB40-62D3935236BB",
  "https://www.cukashmir.ac.in/#/departlist;id=E9C19745-6913-4E8A-AB40-62D3935236BB",
  "https://www.cukashmir.ac.in/#/administration;id=E9C19745-6913-4E8A-AB40-62D3935236BB",
  "https://www.cukashmir.ac.in/#/content;id=21E6749C-0DF4-43DD-9833-B8CD9F63374B",
  "https://www.cukashmir.ac.in/#/departlist;id=21E6749C-0DF4-43DD-9833-B8CD9F63374B",
  "https://www.cukashmir.ac.in/#/administration;id=21E6749C-0DF4-43DD-9833-B8CD9F63374B",
  "https://www.cukashmir.ac.in/#/content;id=26652E55-023A-4112-B0A1-963514F544E7",
  "https://www.cukashmir.ac.in/#/departlist;id=26652E55-023A-4112-B0A1-963514F544E7",
  "https://www.cukashmir.ac.in/#/administration;id=26652E55-023A-4112-B0A1-963514F544E7",
  "https://www.cukashmir.ac.in/#/content;id=65D63E9C-6CBA-45ED-AAC2-8F2150B6AD9D",
  "https://www.cukashmir.ac.in/#/departlist;id=65D63E9C-6CBA-45ED-AAC2-8F2150B6AD9D",
  "https://www.cukashmir.ac.in/#/administration;id=65D63E9C-6CBA-45ED-AAC2-8F2150B6AD9D",
  "https://www.cukashmir.ac.in/#/content;id=8F916200-C227-4433-83EC-A8519E6105C6",
  "https://www.cukashmir.ac.in/#/departlist;id=8F916200-C227-4433-83EC-A8519E6105C6",
  "https://www.cukashmir.ac.in/#/administration;id=8F916200-C227-4433-83EC-A8519E6105C6",
  "https://www.cukashmir.ac.in/#/content;id=84A13388-3449-4EBE-A523-0CC8639F7CE6",
  "https://www.cukashmir.ac.in/#/departlist;id=84A13388-3449-4EBE-A523-0CC8639F7CE6",
  "https://www.cukashmir.ac.in/#/administration;id=84A13388-3449-4EBE-A523-0CC8639F7CE6",
  "https://www.cukashmir.ac.in/#/content;id=607CCF3C-CFDB-4B54-91D5-1EE08604C78B",
  "https://www.cukashmir.ac.in/#/departlist;id=607CCF3C-CFDB-4B54-91D5-1EE08604C78B",
  "https://www.cukashmir.ac.in/#/administration;id=607CCF3C-CFDB-4B54-91D5-1EE08604C78B",
  "https://www.cukashmir.ac.in/#/content;id=4BD6B8A7-DA44-4FE5-A1E8-F8876066C734",
  "https://www.cukashmir.ac.in/#/departlist;id=4BD6B8A7-DA44-4FE5-A1E8-F8876066C734",
  "https://www.cukashmir.ac.in/#/administration;id=4BD6B8A7-DA44-4FE5-A1E8-F8876066C734",
  "https://www.cukashmir.ac.in/#/content;id=F7C900E0-CEBA-4A39-8673-52E09C853193",
  "https://www.cukashmir.ac.in/#/departlist;id=F7C900E0-CEBA-4A39-8673-52E09C853193",
  "https://www.cukashmir.ac.in/#/administration;id=F7C900E0-CEBA-4A39-8673-52E09C853193",
  "https://www.cukashmir.ac.in/#/content;id=97241132-6A2D-414A-9917-2870E0AF3F45",
  "https://www.cukashmir.ac.in/#/departlist;id=97241132-6A2D-414A-9917-2870E0AF3F45",
  "https://www.cukashmir.ac.in/#/administration;id=97241132-6A2D-414A-9917-2870E0AF3F45",
  "https://www.cukashmir.ac.in/#/content;id=8B8ED6CA-3A28-46A6-9D72-624F5C97DD11",
  "https://www.cukashmir.ac.in/#/departlist;id=8B8ED6CA-3A28-46A6-9D72-624F5C97DD11",
  "https://www.cukashmir.ac.in/#/administration;id=8B8ED6CA-3A28-46A6-9D72-624F5C97DD11",
  "https://www.cukashmir.ac.in/#/content;id=C9957C68-9B51-4AE9-92B4-B8C7847FF653",
  "https://www.cukashmir.ac.in/#/departlist;id=C9957C68-9B51-4AE9-92B4-B8C7847FF653",
  "https://www.cukashmir.ac.in/#/administration;id=C9957C68-9B51-4AE9-92B4-B8C7847FF653",
  "https://www.cukashmir.ac.in/#/content;id=BC792BC0-A676-4038-8249-74B774D88B8F",
  "https://www.cukashmir.ac.in/#/departlist;id=BC792BC0-A676-4038-8249-74B774D88B8F",
  "https://www.cukashmir.ac.in/#/administration;id=BC792BC0-A676-4038-8249-74B774D88B8F",
  "https://www.cukashmir.ac.in/#/content;id=431D6536-C1AA-4C3F-87FA-21888480FBA5",
  "https://www.cukashmir.ac.in/#/departlist;id=431D6536-C1AA-4C3F-87FA-21888480FBA5",
  "https://www.cukashmir.ac.in/#/administration;id=431D6536-C1AA-4C3F-87FA-21888480FBA5",
  "https://www.cukashmir.ac.in/#/content;id=16D16306-BFE1-4451-80BD-AC5208170C62",
  "https://www.cukashmir.ac.in/#/departlist;id=16D16306-BFE1-4451-80BD-AC5208170C62",
  "https://www.cukashmir.ac.in/#/administration;id=16D16306-BFE1-4451-80BD-AC5208170C62",
  "https://www.cukashmir.ac.in/#/content;id=C5B2B12F-1009-4BCD-92DA-0498CA387D65",
  "https://www.cukashmir.ac.in/#/departlist;id=C5B2B12F-1009-4BCD-92DA-0498CA387D65",
  "https://www.cukashmir.ac.in/#/administration;id=C5B2B12F-1009-4BCD-92DA-0498CA387D65",
  "https://www.cukashmir.ac.in/#/content;id=66AD63CA-7E92-407D-8438-C0B2921BA317",
  "https://www.cukashmir.ac.in/#/departlist;id=66AD63CA-7E92-407D-8438-C0B2921BA317",
  "https://www.cukashmir.ac.in/#/administration;id=66AD63CA-7E92-407D-8438-C0B2921BA317",
  "https://www.cukashmir.ac.in/#/content;id=78521E64-8438-4245-9AD7-E4C172C27AF7",
  "https://www.cukashmir.ac.in/#/departlist;id=78521E64-8438-4245-9AD7-E4C172C27AF7",
  "https://www.cukashmir.ac.in/#/administration;id=78521E64-8438-4245-9AD7-E4C172C27AF7",
  "https://www.cukashmir.ac.in/#/content;id=CC271E09-2D82-47AF-BC6F-A21A6CBE86B0",
  "https://www.cukashmir.ac.in/#/departlist;id=CC271E09-2D82-47AF-BC6F-A21A6CBE86B0",
  "https://www.cukashmir.ac.in/#/administration;id=CC271E09-2D82-47AF-BC6F-A21A6CBE86B0",
  "https://www.cukashmir.ac.in/#/content;id=EAE79DEB-8106-49FA-9034-EA16C20EB684",
  "https://www.cukashmir.ac.in/#/departlist;id=EAE79DEB-8106-49FA-9034-EA16C20EB684",
  "https://www.cukashmir.ac.in/#/administration;id=EAE79DEB-8106-49FA-9034-EA16C20EB684",
  "https://www.cukashmir.ac.in/#/content;id=21436D94-DA8D-4868-ADEE-5B1A6899AA3F",
  "https://www.cukashmir.ac.in/#/departlist;id=21436D94-DA8D-4868-ADEE-5B1A6899AA3F",
  "https://www.cukashmir.ac.in/#/administration;id=21436D94-DA8D-4868-ADEE-5B1A6899AA3F",
  "https://www.cukashmir.ac.in/#/content;id=CD8D746F-527A-4EA3-A9B4-BE0AD1581EF9",
  "https://www.cukashmir.ac.in/#/departlist;id=CD8D746F-527A-4EA3-A9B4-BE0AD1581EF9",
  "https://www.cukashmir.ac.in/#/administration;id=CD8D746F-527A-4EA3-A9B4-BE0AD1581EF9",
  "https://www.cukashmir.ac.in/#/content;id=0374F3E9-148A-48EF-9ABF-1DA0E35B7449",
  "https://www.cukashmir.ac.in/#/departlist;id=0374F3E9-148A-48EF-9ABF-1DA0E35B7449",
  "https://www.cukashmir.ac.in/#/administration;id=0374F3E9-148A-48EF-9ABF-1DA0E35B7449",
  "https://www.cukashmir.ac.in/#/content;id=B7C71AD3-E432-43C1-BFD6-BC78A10EE1DE",
  "https://www.cukashmir.ac.in/#/departlist;id=B7C71AD3-E432-43C1-BFD6-BC78A10EE1DE",
  "https://www.cukashmir.ac.in/#/administration;id=B7C71AD3-E432-43C1-BFD6-BC78A10EE1DE",
  "https://www.cukashmir.ac.in/#/content;id=53ABD4EF-FD21-48BD-B889-8E2DAE07534E",
  "https://www.cukashmir.ac.in/#/departlist;id=53ABD4EF-FD21-48BD-B889-8E2DAE07534E",
  "https://www.cukashmir.ac.in/#/administration;id=53ABD4EF-FD21-48BD-B889-8E2DAE07534E",
  "https://www.cukashmir.ac.in/#/content;id=28F33241-B9F3-41EB-8736-FB9D8E57D374",
  "https://www.cukashmir.ac.in/#/departlist;id=28F33241-B9F3-41EB-8736-FB9D8E57D374",
  "https://www.cukashmir.ac.in/#/administration;id=28F33241-B9F3-41EB-8736-FB9D8E57D374",
  "https://www.cukashmir.ac.in/#/content;id=BE64C0F5-7ED0-46C7-B600-BE74E290A55B",
  "https://www.cukashmir.ac.in/#/departlist;id=BE64C0F5-7ED0-46C7-B600-BE74E290A55B",
  "https://www.cukashmir.ac.in/#/administration;id=BE64C0F5-7ED0-46C7-B600-BE74E290A55B",
  "https://www.cukashmir.ac.in/#/content;id=6730AEB1-186E-4421-9454-D9F71B3F7540",
  "https://www.cukashmir.ac.in/#/departlist;id=6730AEB1-186E-4421-9454-D9F71B3F7540",
  "https://www.cukashmir.ac.in/#/administration;id=6730AEB1-186E-4421-9454-D9F71B3F7540",
  "https://www.cukashmir.ac.in/#/content;id=8E88C6B7-3749-4271-9384-6336FA7C4C9A",
  "https://www.cukashmir.ac.in/#/departlist;id=8E88C6B7-3749-4271-9384-6336FA7C4C9A",
  "https://www.cukashmir.ac.in/#/administration;id=8E88C6B7-3749-4271-9384-6336FA7C4C9A",
  "https://www.cukashmir.ac.in/#/content;id=FFC98010-509F-4350-9AFE-281FA3A05D6C",
  "https://www.cukashmir.ac.in/#/departlist;id=FFC98010-509F-4350-9AFE-281FA3A05D6C",
  "https://www.cukashmir.ac.in/#/administration;id=FFC98010-509F-4350-9AFE-281FA3A05D6C",
  "https://www.cukashmir.ac.in/#/content;id=094D900C-4EB9-49D5-8380-F5D6B85F46F6",
  "https://www.cukashmir.ac.in/#/departlist;id=094D900C-4EB9-49D5-8380-F5D6B85F46F6",
  "https://www.cukashmir.ac.in/#/administration;id=094D900C-4EB9-49D5-8380-F5D6B85F46F6",
  "https://www.cukashmir.ac.in/#/content;id=40DF3E15-6055-4951-8D57-0B6BC4BEC52D",
  "https://www.cukashmir.ac.in/#/departlist;id=40DF3E15-6055-4951-8D57-0B6BC4BEC52D",
  "https://www.cukashmir.ac.in/#/administration;id=40DF3E15-6055-4951-8D57-0B6BC4BEC52D",
  "https://www.cukashmir.ac.in/#/content;id=C774DEC4-5025-403C-928F-D83CEE870BEF",
  "https://www.cukashmir.ac.in/#/departlist;id=C774DEC4-5025-403C-928F-D83CEE870BEF",
  "https://www.cukashmir.ac.in/#/administration;id=C774DEC4-5025-403C-928F-D83CEE870BEF",
  "https://www.cukashmir.ac.in/#/content;id=EDC2F7D7-F1EB-4734-ABC7-D8D815B33E83",
  "https://www.cukashmir.ac.in/#/departlist;id=EDC2F7D7-F1EB-4734-ABC7-D8D815B33E83",
  "https://www.cukashmir.ac.in/#/administration;id=EDC2F7D7-F1EB-4734-ABC7-D8D815B33E83",
  "https://www.cukashmir.ac.in/#/content;id=76C93D2C-D3AE-401A-A587-7DAB1FAE97D0",
  "https://www.cukashmir.ac.in/#/departlist;id=76C93D2C-D3AE-401A-A587-7DAB1FAE97D0",
  "https://www.cukashmir.ac.in/#/administration;id=76C93D2C-D3AE-401A-A587-7DAB1FAE97D0",
  "https://www.cukashmir.ac.in/#/content;id=6C78FD2B-841A-4E80-BDD6-50DF497210E9",
  "https://www.cukashmir.ac.in/#/departlist;id=6C78FD2B-841A-4E80-BDD6-50DF497210E9",
  "https://www.cukashmir.ac.in/#/administration;id=6C78FD2B-841A-4E80-BDD6-50DF497210E9",
  "https://www.cukashmir.ac.in/#/content;id=23AB117D-3D4E-420E-BBC2-B84638A7D894",
  "https://www.cukashmir.ac.in/#/departlist;id=23AB117D-3D4E-420E-BBC2-B84638A7D894",
  "https://www.cukashmir.ac.in/#/administration;id=23AB117D-3D4E-420E-BBC2-B84638A7D894",
  "https://www.cukashmir.ac.in/#/content;id=776E607A-4637-423D-B077-8FAAE6183563",
  "https://www.cukashmir.ac.in/#/departlist;id=776E607A-4637-423D-B077-8FAAE6183563",
  "https://www.cukashmir.ac.in/#/administration;id=776E607A-4637-423D-B077-8FAAE6183563",
  "https://www.cukashmir.ac.in/#/content;id=88DFD9B1-88F4-4A44-A135-AFD4DFB754DC",
  "https://www.cukashmir.ac.in/#/departlist;id=88DFD9B1-88F4-4A44-A135-AFD4DFB754DC",
  "https://www.cukashmir.ac.in/#/administration;id=88DFD9B1-88F4-4A44-A135-AFD4DFB754DC",
  "https://www.cukashmir.ac.in/#/content;id=A64E1CB7-72FF-4937-BD5D-DDB48264839F",
  "https://www.cukashmir.ac.in/#/departlist;id=A64E1CB7-72FF-4937-BD5D-DDB48264839F",
  "https://www.cukashmir.ac.in/#/administration;id=A64E1CB7-72FF-4937-BD5D-DDB48264839F",
  "https://www.cukashmir.ac.in/#/content;id=C7DFF971-2FB1-42EE-9155-57BA0346571D",
  "https://www.cukashmir.ac.in/#/departlist;id=C7DFF971-2FB1-42EE-9155-57BA0346571D",
  "https://www.cukashmir.ac.in/#/administration;id=C7DFF971-2FB1-42EE-9155-57BA0346571D",
  "https://www.cukashmir.ac.in/#/content;id=5D8FC8F6-E1FD-4172-AB54-630F8F7B9258",
  "https://www.cukashmir.ac.in/#/departlist;id=5D8FC8F6-E1FD-4172-AB54-630F8F7B9258",
  "https://www.cukashmir.ac.in/#/administration;id=5D8FC8F6-E1FD-4172-AB54-630F8F7B9258",
  "https://www.cukashmir.ac.in/#/content;id=DDF0B645-5419-4F9E-9A36-E9A355D10E5A",
  "https://www.cukashmir.ac.in/#/departlist;id=DDF0B645-5419-4F9E-9A36-E9A355D10E5A",
  "https://www.cukashmir.ac.in/#/administration;id=DDF0B645-5419-4F9E-9A36-E9A355D10E5A",
  "https://www.cukashmir.ac.in/#/content;id=827D4BA8-2627-4EDF-B3E8-474731005161",
  "https://www.cukashmir.ac.in/#/departlist;id=827D4BA8-2627-4EDF-B3E8-474731005161",
  "https://www.cukashmir.ac.in/#/administration;id=827D4BA8-2627-4EDF-B3E8-474731005161",
  "https://www.cukashmir.ac.in/#/content;id=2BCD7E1A-D33A-4094-BE30-9F0377BC63C1",
  "https://www.cukashmir.ac.in/#/departlist;id=2BCD7E1A-D33A-4094-BE30-9F0377BC63C1",
  "https://www.cukashmir.ac.in/#/administration;id=2BCD7E1A-D33A-4094-BE30-9F0377BC63C1",
  "https://www.cukashmir.ac.in/#/content;id=296D920C-BD80-4A5A-87BC-08187EC2FC78",
  "https://www.cukashmir.ac.in/#/departlist;id=296D920C-BD80-4A5A-87BC-08187EC2FC78",
  "https://www.cukashmir.ac.in/#/administration;id=296D920C-BD80-4A5A-87BC-08187EC2FC78",
  "https://www.cukashmir.ac.in/#/content;id=1C674317-B0BE-4FCA-8330-6113500374F8",
  "https://www.cukashmir.ac.in/#/departlist;id=1C674317-B0BE-4FCA-8330-6113500374F8",
  "https://www.cukashmir.ac.in/#/administration;id=1C674317-B0BE-4FCA-8330-6113500374F8",
  "https://www.cukashmir.ac.in/#/content;id=5654965B-EB67-42B0-A444-AB5E46C8A0D8",
  "https://www.cukashmir.ac.in/#/departlist;id=5654965B-EB67-42B0-A444-AB5E46C8A0D8",
  "https://www.cukashmir.ac.in/#/administration;id=5654965B-EB67-42B0-A444-AB5E46C8A0D8",
  "https://www.cukashmir.ac.in/#/content;id=B5C282D9-8928-4C12-B821-8C693347E6B1",
  "https://www.cukashmir.ac.in/#/departlist;id=B5C282D9-8928-4C12-B821-8C693347E6B1",
  "https://www.cukashmir.ac.in/#/administration;id=B5C282D9-8928-4C12-B821-8C693347E6B1",
  "https://www.cukashmir.ac.in/#/content;id=4EF55B6E-6EF4-48F0-A9DA-F28D0C60D3D9",
  "https://www.cukashmir.ac.in/#/departlist;id=4EF55B6E-6EF4-48F0-A9DA-F28D0C60D3D9",
  "https://www.cukashmir.ac.in/#/administration;id=4EF55B6E-6EF4-48F0-A9DA-F28D0C60D3D9",
  "https://www.cukashmir.ac.in/#/content;id=D8CE59F1-7A99-4E9A-841E-AC22BB61D9D2",
  "https://www.cukashmir.ac.in/#/departlist;id=D8CE59F1-7A99-4E9A-841E-AC22BB61D9D2",
  "https://www.cukashmir.ac.in/#/administration;id=D8CE59F1-7A99-4E9A-841E-AC22BB61D9D2",
  "https://www.cukashmir.ac.in/#/content;id=E76A3AFD-F0A1-42C9-A8F4-392FD50C0179",
  "https://www.cukashmir.ac.in/#/departlist;id=E76A3AFD-F0A1-42C9-A8F4-392FD50C0179",
  "https://www.cukashmir.ac.in/#/administration;id=E76A3AFD-F0A1-42C9-A8F4-392FD50C0179",
  "https://www.cukashmir.ac.in/#/content;id=B71141BC-6D4B-4192-A6ED-296836460398",
  "https://www.cukashmir.ac.in/#/departlist;id=B71141BC-6D4B-4192-A6ED-296836460398",
  "https://www.cukashmir.ac.in/#/administration;id=B71141BC-6D4B-4192-A6ED-296836460398",
  "https://www.cukashmir.ac.in/#/content;id=0859E58F-44C2-4F8A-817F-128BF5668525",
  "https://www.cukashmir.ac.in/#/departlist;id=0859E58F-44C2-4F8A-817F-128BF5668525",
  "https://www.cukashmir.ac.in/#/administration;id=0859E58F-44C2-4F8A-817F-128BF5668525",
  "https://www.cukashmir.ac.in/#/content;id=A1DCFEB8-85D7-46D7-923A-5F76BE325007",
  "https://www.cukashmir.ac.in/#/departlist;id=A1DCFEB8-85D7-46D7-923A-5F76BE325007",
  "https://www.cukashmir.ac.in/#/administration;id=A1DCFEB8-85D7-46D7-923A-5F76BE325007",
  "https://www.cukashmir.ac.in/#/content;id=4E84244A-3033-44A6-AF64-3920F0640BBD",
  "https://www.cukashmir.ac.in/#/departlist;id=4E84244A-3033-44A6-AF64-3920F0640BBD",
  "https://www.cukashmir.ac.in/#/administration;id=4E84244A-3033-44A6-AF64-3920F0640BBD",
  "https://www.cukashmir.ac.in/#/content;id=A506D52C-2C5B-4FBF-9EFE-D7B5D7573104",
  "https://www.cukashmir.ac.in/#/departlist;id=A506D52C-2C5B-4FBF-9EFE-D7B5D7573104",
  "https://www.cukashmir.ac.in/#/administration;id=A506D52C-2C5B-4FBF-9EFE-D7B5D7573104",
  "https://www.cukashmir.ac.in/#/content;id=12E05A7D-37F5-4C7E-B0EB-0D04A661B1FF",
  "https://www.cukashmir.ac.in/#/departlist;id=12E05A7D-37F5-4C7E-B0EB-0D04A661B1FF",
  "https://www.cukashmir.ac.in/#/administration;id=12E05A7D-37F5-4C7E-B0EB-0D04A661B1FF",
  "https://www.cukashmir.ac.in/#/content;id=D45364A9-D6E7-4F29-A46F-57DABCFDB03A",
  "https://www.cukashmir.ac.in/#/departlist;id=D45364A9-D6E7-4F29-A46F-57DABCFDB03A",
  "https://www.cukashmir.ac.in/#/administration;id=D45364A9-D6E7-4F29-A46F-57DABCFDB03A",
  "https://www.cukashmir.ac.in/#/content;id=773D3666-C6FB-4CF9-B6BA-EC2443D0F2E0",
  "https://www.cukashmir.ac.in/#/departlist;id=773D3666-C6FB-4CF9-B6BA-EC2443D0F2E0",
  "https://www.cukashmir.ac.in/#/administration;id=773D3666-C6FB-4CF9-B6BA-EC2443D0F2E0",
  "https://www.cukashmir.ac.in/#/content;id=488AA4A5-68F8-4B70-9167-6F74A35ADFB7",
  "https://www.cukashmir.ac.in/#/departlist;id=488AA4A5-68F8-4B70-9167-6F74A35ADFB7",
  "https://www.cukashmir.ac.in/#/administration;id=488AA4A5-68F8-4B70-9167-6F74A35ADFB7",
  "https://www.cukashmir.ac.in/#/content;id=FA04D4A9-DB7F-441A-A792-E43C608F5339",
  "https://www.cukashmir.ac.in/#/departlist;id=FA04D4A9-DB7F-441A-A792-E43C608F5339",
  "https://www.cukashmir.ac.in/#/administration;id=FA04D4A9-DB7F-441A-A792-E43C608F5339",
  "https://www.cukashmir.ac.in/#/content;id=91398C93-CF9E-4F7B-814D-34ED8743F354",
  "https://www.cukashmir.ac.in/#/departlist;id=91398C93-CF9E-4F7B-814D-34ED8743F354",
  "https://www.cukashmir.ac.in/#/administration;id=91398C93-CF9E-4F7B-814D-34ED8743F354",
  "https://www.cukashmir.ac.in/#/content;id=F7FC1840-9DFB-440E-96FA-32AF571C0181",
  "https://www.cukashmir.ac.in/#/departlist;id=F7FC1840-9DFB-440E-96FA-32AF571C0181",
  "https://www.cukashmir.ac.in/#/administration;id=F7FC1840-9DFB-440E-96FA-32AF571C0181",
  "https://www.cukashmir.ac.in/#/content;id=B8360C07-63C7-40D2-B03D-E2DFBB8A98B5",
  "https://www.cukashmir.ac.in/#/departlist;id=B8360C07-63C7-40D2-B03D-E2DFBB8A98B5",
  "https://www.cukashmir.ac.in/#/administration;id=B8360C07-63C7-40D2-B03D-E2DFBB8A98B5",
  "https://www.cukashmir.ac.in/#/content;id=471DBF1C-9C1D-4C85-800E-BE2C06C61F82",
  "https://www.cukashmir.ac.in/#/departlist;id=471DBF1C-9C1D-4C85-800E-BE2C06C61F82",
  "https://www.cukashmir.ac.in/#/administration;id=471DBF1C-9C1D-4C85-800E-BE2C06C61F82",
  "https://www.cukashmir.ac.in/#/content;id=18869BC7-EC49-44E2-AEDE-78286E40AC30",
  "https://www.cukashmir.ac.in/#/departlist;id=18869BC7-EC49-44E2-AEDE-78286E40AC30",
  "https://www.cukashmir.ac.in/#/administration;id=18869BC7-EC49-44E2-AEDE-78286E40AC30",
  "https://www.cukashmir.ac.in/#/content;id=BACC8123-3E72-43EA-9E0D-325203B9E92E",
  "https://www.cukashmir.ac.in/#/departlist;id=BACC8123-3E72-43EA-9E0D-325203B9E92E",
  "https://www.cukashmir.ac.in/#/administration;id=BACC8123-3E72-43EA-9E0D-325203B9E92E",
  "https://www.cukashmir.ac.in/#/content;id=A59648A6-90A6-4A2C-9A19-AF48BF04B56F",
  "https://www.cukashmir.ac.in/#/departlist;id=A59648A6-90A6-4A2C-9A19-AF48BF04B56F",
  "https://www.cukashmir.ac.in/#/administration;id=A59648A6-90A6-4A2C-9A19-AF48BF04B56F",
  "https://www.cukashmir.ac.in/#/content;id=A34ED9CD-6BD1-4487-BABA-E4099F452D29",
  "https://www.cukashmir.ac.in/#/departlist;id=A34ED9CD-6BD1-4487-BABA-E4099F452D29",
  "https://www.cukashmir.ac.in/#/administration;id=A34ED9CD-6BD1-4487-BABA-E4099F452D29",
  "https://www.cukashmir.ac.in/#/content;id=1680E3C6-E6AD-4309-8758-388807F78CB4",
  "https://www.cukashmir.ac.in/#/departlist;id=1680E3C6-E6AD-4309-8758-388807F78CB4",
  "https://www.cukashmir.ac.in/#/administration;id=1680E3C6-E6AD-4309-8758-388807F78CB4",
  "https://www.cukashmir.ac.in/#/content;id=5B005158-7E20-4405-B6B8-EF9C9215888E",
  "https://www.cukashmir.ac.in/#/departlist;id=5B005158-7E20-4405-B6B8-EF9C9215888E",
  "https://www.cukashmir.ac.in/#/administration;id=5B005158-7E20-4405-B6B8-EF9C9215888E",
  "https://www.cukashmir.ac.in/#/content;id=EA163F19-DB22-42D2-B4DD-B19FD5AF4F43",
  "https://www.cukashmir.ac.in/#/departlist;id=EA163F19-DB22-42D2-B4DD-B19FD5AF4F43",
  "https://www.cukashmir.ac.in/#/administration;id=EA163F19-DB22-42D2-B4DD-B19FD5AF4F43",
  "https://www.cukashmir.ac.in/#/content;id=1700302C-02CA-418A-9E16-AA7B1F62CCE2",
  "https://www.cukashmir.ac.in/#/departlist;id=1700302C-02CA-418A-9E16-AA7B1F62CCE2",
  "https://www.cukashmir.ac.in/#/administration;id=1700302C-02CA-418A-9E16-AA7B1F62CCE2",
  "https://www.cukashmir.ac.in/#/content;id=1D361BA9-4AFC-4D38-AB49-E7028A64E776",
  "https://www.cukashmir.ac.in/#/departlist;id=1D361BA9-4AFC-4D38-AB49-E7028A64E776",
  "https://www.cukashmir.ac.in/#/administration;id=1D361BA9-4AFC-4D38-AB49-E7028A64E776",
  "https://www.cukashmir.ac.in/#/content;id=9CD89655-CD57-4A21-BE67-51D8F3547DE0",
  "https://www.cukashmir.ac.in/#/departlist;id=9CD89655-CD57-4A21-BE67-51D8F3547DE0",
  "https://www.cukashmir.ac.in/#/administration;id=9CD89655-CD57-4A21-BE67-51D8F3547DE0",
  "https://www.cukashmir.ac.in/#/content;id=7D95E148-AF2B-43E4-BD1D-5DA87B8C418D",
  "https://www.cukashmir.ac.in/#/departlist;id=7D95E148-AF2B-43E4-BD1D-5DA87B8C418D",
  "https://www.cukashmir.ac.in/#/administration;id=7D95E148-AF2B-43E4-BD1D-5DA87B8C418D",
  "https://www.cukashmir.ac.in/#/content;id=1A522CF6-7175-4FD3-9AF7-0614EB78DAA6",
  "https://www.cukashmir.ac.in/#/departlist;id=1A522CF6-7175-4FD3-9AF7-0614EB78DAA6",
  "https://www.cukashmir.ac.in/#/administration;id=1A522CF6-7175-4FD3-9AF7-0614EB78DAA6",
  "https://www.cukashmir.ac.in/#/content;id=D4FE3125-24A9-4FB6-B0D8-B2E05E4472E8",
  "https://www.cukashmir.ac.in/#/departlist;id=D4FE3125-24A9-4FB6-B0D8-B2E05E4472E8",
  "https://www.cukashmir.ac.in/#/administration;id=D4FE3125-24A9-4FB6-B0D8-B2E05E4472E8",
  "https://www.cukashmir.ac.in/#/content;id=C4021D14-6C7C-4B16-BB86-193D245642AF",
  "https://www.cukashmir.ac.in/#/departlist;id=C4021D14-6C7C-4B16-BB86-193D245642AF",
  "https://www.cukashmir.ac.in/#/administration;id=C4021D14-6C7C-4B16-BB86-193D245642AF",
  "https://www.cukashmir.ac.in/#/content;id=4EB70150-F6AB-44F2-BC0A-0199944F0150",
  "https://www.cukashmir.ac.in/#/departlist;id=4EB70150-F6AB-44F2-BC0A-0199944F0150",
  "https://www.cukashmir.ac.in/#/administration;id=4EB70150-F6AB-44F2-BC0A-0199944F0150",
  "https://www.cukashmir.ac.in/#/content;id=DBC0DA3E-AF5E-4115-ABD9-3484188BED9A",
  "https://www.cukashmir.ac.in/#/departlist;id=DBC0DA3E-AF5E-4115-ABD9-3484188BED9A",
  "https://www.cukashmir.ac.in/#/administration;id=DBC0DA3E-AF5E-4115-ABD9-3484188BED9A",
  "https://www.cukashmir.ac.in/#/content;id=E0B2A45B-81A3-46A3-A53F-0CD617F8B2EC",
  "https://www.cukashmir.ac.in/#/departlist;id=E0B2A45B-81A3-46A3-A53F-0CD617F8B2EC",
  "https://www.cukashmir.ac.in/#/administration;id=E0B2A45B-81A3-46A3-A53F-0CD617F8B2EC",
  "https://www.cukashmir.ac.in/#/content;id=7022529F-5494-4B1E-9A76-EB211C56019A",
  "https://www.cukashmir.ac.in/#/departlist;id=7022529F-5494-4B1E-9A76-EB211C56019A",
  "https://www.cukashmir.ac.in/#/administration;id=7022529F-5494-4B1E-9A76-EB211C56019A",
  "https://www.cukashmir.ac.in/#/content;id=0137C4F2-AA33-49B5-B542-CEAE5554B4C5",
  "https://www.cukashmir.ac.in/#/departlist;id=0137C4F2-AA33-49B5-B542-CEAE5554B4C5",
  "https://www.cukashmir.ac.in/#/administration;id=0137C4F2-AA33-49B5-B542-CEAE5554B4C5",
  "https://www.cukashmir.ac.in/#/content;id=385069FD-AA4A-4FED-A20F-AAEC0D7EC065",
  "https://www.cukashmir.ac.in/#/departlist;id=385069FD-AA4A-4FED-A20F-AAEC0D7EC065",
  "https://www.cukashmir.ac.in/#/administration;id=385069FD-AA4A-4FED-A20F-AAEC0D7EC065",
  "https://www.cukashmir.ac.in/#/content;id=1657497A-728D-4754-BE0D-87F8F768BFAE",
  "https://www.cukashmir.ac.in/#/departlist;id=1657497A-728D-4754-BE0D-87F8F768BFAE",
  "https://www.cukashmir.ac.in/#/administration;id=1657497A-728D-4754-BE0D-87F8F768BFAE",
  "https://www.cukashmir.ac.in/#/content;id=6D6B91E8-B0F1-4442-BA3F-DF1D7ADF7EB6",
  "https://www.cukashmir.ac.in/#/departlist;id=6D6B91E8-B0F1-4442-BA3F-DF1D7ADF7EB6",
  "https://www.cukashmir.ac.in/#/administration;id=6D6B91E8-B0F1-4442-BA3F-DF1D7ADF7EB6",
  "https://www.cukashmir.ac.in/#/content;id=9AAC5986-7E40-4E2A-AF46-AD5FFD1D25B7",
  "https://www.cukashmir.ac.in/#/departlist;id=9AAC5986-7E40-4E2A-AF46-AD5FFD1D25B7",
  "https://www.cukashmir.ac.in/#/administration;id=9AAC5986-7E40-4E2A-AF46-AD5FFD1D25B7",
  "https://www.cukashmir.ac.in/#/content;id=4F5A3434-88BA-48F3-83BB-63EBD665F908",
  "https://www.cukashmir.ac.in/#/departlist;id=4F5A3434-88BA-48F3-83BB-63EBD665F908",
  "https://www.cukashmir.ac.in/#/administration;id=4F5A3434-88BA-48F3-83BB-63EBD665F908",
  "https://www.cukashmir.ac.in/#/content;id=6496C2D2-015E-46A1-9DA3-B71823EB1144",
  "https://www.cukashmir.ac.in/#/departlist;id=6496C2D2-015E-46A1-9DA3-B71823EB1144",
  "https://www.cukashmir.ac.in/#/administration;id=6496C2D2-015E-46A1-9DA3-B71823EB1144",
  "https://www.cukashmir.ac.in/#/content;id=F58AE9F4-728C-4BFF-9F7C-8F641730573F",
  "https://www.cukashmir.ac.in/#/departlist;id=F58AE9F4-728C-4BFF-9F7C-8F641730573F",
  "https://www.cukashmir.ac.in/#/administration;id=F58AE9F4-728C-4BFF-9F7C-8F641730573F",
  "https://www.cukashmir.ac.in/#/content;id=0AB3FCA9-EF65-47E7-8E86-482779878183",
  "https://www.cukashmir.ac.in/#/departlist;id=0AB3FCA9-EF65-47E7-8E86-482779878183",
  "https://www.cukashmir.ac.in/#/administration;id=0AB3FCA9-EF65-47E7-8E86-482779878183",
  "https://www.cukashmir.ac.in/#/content;id=E9D3225A-3D7A-4ABF-AA3E-D937B8369CF4",
  "https://www.cukashmir.ac.in/#/departlist;id=E9D3225A-3D7A-4ABF-AA3E-D937B8369CF4",
  "https://www.cukashmir.ac.in/#/administration;id=E9D3225A-3D7A-4ABF-AA3E-D937B8369CF4",
  "https://www.cukashmir.ac.in/#/content;id=F3A1CF99-DA38-49A4-A333-847E5FF36CD5",
  "https://www.cukashmir.ac.in/#/departlist;id=F3A1CF99-DA38-49A4-A333-847E5FF36CD5",
  "https://www.cukashmir.ac.in/#/administration;id=F3A1CF99-DA38-49A4-A333-847E5FF36CD5",
  "https://www.cukashmir.ac.in/#/content;id=3C64F7FC-47C1-4D31-8143-08CD355E48D0",
  "https://www.cukashmir.ac.in/#/departlist;id=3C64F7FC-47C1-4D31-8143-08CD355E48D0",
  "https://www.cukashmir.ac.in/#/administration;id=3C64F7FC-47C1-4D31-8143-08CD355E48D0",
  "https://www.cukashmir.ac.in/#/content;id=8DD6DD10-62C6-41D0-A1AA-2E54D638E532",
  "https://www.cukashmir.ac.in/#/departlist;id=8DD6DD10-62C6-41D0-A1AA-2E54D638E532",
  "https://www.cukashmir.ac.in/#/administration;id=8DD6DD10-62C6-41D0-A1AA-2E54D638E532",
  "https://www.cukashmir.ac.in/#/content;id=C57A7705-E880-470D-A7F7-3E999A997A0F",
  "https://www.cukashmir.ac.in/#/departlist;id=C57A7705-E880-470D-A7F7-3E999A997A0F",
  "https://www.cukashmir.ac.in/#/administration;id=C57A7705-E880-470D-A7F7-3E999A997A0F",
  "https://www.cukashmir.ac.in/#/content;id=2E96E8CD-7D00-4C76-9DB4-12856B19875F",
  "https://www.cukashmir.ac.in/#/departlist;id=2E96E8CD-7D00-4C76-9DB4-12856B19875F",
  "https://www.cukashmir.ac.in/#/administration;id=2E96E8CD-7D00-4C76-9DB4-12856B19875F",
  "https://www.cukashmir.ac.in/#/content;id=2FF023A1-242B-4880-8D2E-46FEB35E8A06",
  "https://www.cukashmir.ac.in/#/departlist;id=2FF023A1-242B-4880-8D2E-46FEB35E8A06",
  "https://www.cukashmir.ac.in/#/administration;id=2FF023A1-242B-4880-8D2E-46FEB35E8A06",
  "https://www.cukashmir.ac.in/#/content;id=fb529b97-28d7-4f2c-8b77-433065d4dfcc",
  "https://www.cukashmir.ac.in/#/departlist;id=fb529b97-28d7-4f2c-8b77-433065d4dfcc",
  "https://www.cukashmir.ac.in/#/administration;id=fb529b97-28d7-4f2c-8b77-433065d4dfcc",
  "https://www.cukashmir.ac.in/#/content;id=4b43e59a-76d3-4273-bfc7-36bf0b3d0b21",
  "https://www.cukashmir.ac.in/#/departlist;id=4b43e59a-76d3-4273-bfc7-36bf0b3d0b21",
  "https://www.cukashmir.ac.in/#/administration;id=4b43e59a-76d3-4273-bfc7-36bf0b3d0b21",
  "https://www.cukashmir.ac.in/#/content;id=1a64b814-cbef-40c5-8e46-7202cff69b64",
  "https://www.cukashmir.ac.in/#/departlist;id=1a64b814-cbef-40c5-8e46-7202cff69b64",
  "https://www.cukashmir.ac.in/#/administration;id=1a64b814-cbef-40c5-8e46-7202cff69b64",
  "https://www.cukashmir.ac.in/#/content;id=d3d54ee7-fa40-4c62-a55b-50c5239c0d7e",
  "https://www.cukashmir.ac.in/#/departlist;id=d3d54ee7-fa40-4c62-a55b-50c5239c0d7e",
  "https://www.cukashmir.ac.in/#/administration;id=d3d54ee7-fa40-4c62-a55b-50c5239c0d7e",
  "https://www.cukashmir.ac.in/#/content;id=40a5baac-e269-47b7-8739-4f3242c160d3",
  "https://www.cukashmir.ac.in/#/departlist;id=40a5baac-e269-47b7-8739-4f3242c160d3",
  "https://www.cukashmir.ac.in/#/administration;id=40a5baac-e269-47b7-8739-4f3242c160d3",
  "https://www.cukashmir.ac.in/#/content;id=2ba44a77-4c80-40fd-8d87-4874b82e1046",
  "https://www.cukashmir.ac.in/#/departlist;id=2ba44a77-4c80-40fd-8d87-4874b82e1046",
  "https://www.cukashmir.ac.in/#/administration;id=2ba44a77-4c80-40fd-8d87-4874b82e1046",
  "https://www.cukashmir.ac.in/#/content;id=037c4563-0d8f-4df5-95be-4d5a77d4bbdf",
  "https://www.cukashmir.ac.in/#/departlist;id=037c4563-0d8f-4df5-95be-4d5a77d4bbdf",
  "https://www.cukashmir.ac.in/#/administration;id=037c4563-0d8f-4df5-95be-4d5a77d4bbdf",
  "https://www.cukashmir.ac.in/#/content;id=03994a69-598e-4a70-8594-b1b65916befe",
  "https://www.cukashmir.ac.in/#/departlist;id=03994a69-598e-4a70-8594-b1b65916befe",
  "https://www.cukashmir.ac.in/#/administration;id=03994a69-598e-4a70-8594-b1b65916befe",
  "https://www.cukashmir.ac.in/#/content;id=0c1dee6b-e85c-45d8-8989-a38485e2238f",
  "https://www.cukashmir.ac.in/#/departlist;id=0c1dee6b-e85c-45d8-8989-a38485e2238f",
  "https://www.cukashmir.ac.in/#/administration;id=0c1dee6b-e85c-45d8-8989-a38485e2238f",
  "https://www.cukashmir.ac.in/#/content;id=25fb3fad-8d21-41c4-9a0e-443ffb611eb2",
  "https://www.cukashmir.ac.in/#/departlist;id=25fb3fad-8d21-41c4-9a0e-443ffb611eb2",
  "https://www.cukashmir.ac.in/#/administration;id=25fb3fad-8d21-41c4-9a0e-443ffb611eb2",
  "https://www.cukashmir.ac.in/#/content;id=45f84d69-13fd-4cfb-81c5-ce836195977e",
  "https://www.cukashmir.ac.in/#/departlist;id=45f84d69-13fd-4cfb-81c5-ce836195977e",
  "https://www.cukashmir.ac.in/#/administration;id=45f84d69-13fd-4cfb-81c5-ce836195977e",
  "https://www.cukashmir.ac.in/#/content;id=54be7b10-4bf0-4c74-8901-066e57d1a432",
  "https://www.cukashmir.ac.in/#/departlist;id=54be7b10-4bf0-4c74-8901-066e57d1a432",
  "https://www.cukashmir.ac.in/#/administration;id=54be7b10-4bf0-4c74-8901-066e57d1a432",
  "https://www.cukashmir.ac.in/#/content;id=dd99d484-3b39-4cbb-8560-1332336cf76e",
  "https://www.cukashmir.ac.in/#/departlist;id=dd99d484-3b39-4cbb-8560-1332336cf76e",
  "https://www.cukashmir.ac.in/#/administration;id=dd99d484-3b39-4cbb-8560-1332336cf76e",
  "https://www.cukashmir.ac.in/#/content;id=c850c7e1-7401-4b15-8e2a-b5b31c37ff48",
  "https://www.cukashmir.ac.in/#/departlist;id=c850c7e1-7401-4b15-8e2a-b5b31c37ff48",
  "https://www.cukashmir.ac.in/#/administration;id=c850c7e1-7401-4b15-8e2a-b5b31c37ff48",
  "https://www.cukashmir.ac.in/#/content;id=78aeeb49-a6b5-4b16-ae0b-297baf80e3a7",
  "https://www.cukashmir.ac.in/#/departlist;id=78aeeb49-a6b5-4b16-ae0b-297baf80e3a7",
  "https://www.cukashmir.ac.in/#/administration;id=78aeeb49-a6b5-4b16-ae0b-297baf80e3a7",
  "https://www.cukashmir.ac.in/#/content;id=2a349f39-b7c9-457e-b4ad-ee5fe42d4066",
  "https://www.cukashmir.ac.in/#/departlist;id=2a349f39-b7c9-457e-b4ad-ee5fe42d4066",
  "https://www.cukashmir.ac.in/#/administration;id=2a349f39-b7c9-457e-b4ad-ee5fe42d4066",
  "https://www.cukashmir.ac.in/#/content;id=efac3ed3-72ac-49e5-baa2-444773b2a049",
  "https://www.cukashmir.ac.in/#/departlist;id=efac3ed3-72ac-49e5-baa2-444773b2a049",
  "https://www.cukashmir.ac.in/#/administration;id=efac3ed3-72ac-49e5-baa2-444773b2a049",
  "https://www.cukashmir.ac.in/#/content;id=08ab23eb-234b-4601-a30f-b52b8a1e2f82",
  "https://www.cukashmir.ac.in/#/departlist;id=08ab23eb-234b-4601-a30f-b52b8a1e2f82",
  "https://www.cukashmir.ac.in/#/administration;id=08ab23eb-234b-4601-a30f-b52b8a1e2f82",
  "https://www.cukashmir.ac.in/#/content;id=ba26c0cb-5203-413e-92fc-c0fece0ef217",
  "https://www.cukashmir.ac.in/#/departlist;id=ba26c0cb-5203-413e-92fc-c0fece0ef217",
  "https://www.cukashmir.ac.in/#/administration;id=ba26c0cb-5203-413e-92fc-c0fece0ef217",
  "https://www.cukashmir.ac.in/#/content;id=01bd10e6-99fc-45fe-8f85-ca973386d6be",
  "https://www.cukashmir.ac.in/#/departlist;id=01bd10e6-99fc-45fe-8f85-ca973386d6be",
  "https://www.cukashmir.ac.in/#/administration;id=01bd10e6-99fc-45fe-8f85-ca973386d6be",
  "https://www.cukashmir.ac.in/#/content;id=2f390241-ff6c-4b73-970b-2a9424c07352",
  "https://www.cukashmir.ac.in/#/departlist;id=2f390241-ff6c-4b73-970b-2a9424c07352",
  "https://www.cukashmir.ac.in/#/administration;id=2f390241-ff6c-4b73-970b-2a9424c07352",
  "https://www.cukashmir.ac.in/#/content;id=2acb3904-b48c-4cd0-918b-066854c41561",
  "https://www.cukashmir.ac.in/#/departlist;id=2acb3904-b48c-4cd0-918b-066854c41561",
  "https://www.cukashmir.ac.in/#/administration;id=2acb3904-b48c-4cd0-918b-066854c41561",
  "https://www.cukashmir.ac.in/#/content;id=EFD96935-311A-44C8-8DBF-3C8C6E2E0C7E",
  "https://www.cukashmir.ac.in/#/departlist;id=EFD96935-311A-44C8-8DBF-3C8C6E2E0C7E",
  "https://www.cukashmir.ac.in/#/administration;id=EFD96935-311A-44C8-8DBF-3C8C6E2E0C7E",
  "https://www.cukashmir.ac.in/#/content;id=63D0002B-54E6-4B78-A142-63FF68FE6CBC",
  "https://www.cukashmir.ac.in/#/departlist;id=63D0002B-54E6-4B78-A142-63FF68FE6CBC",
  "https://www.cukashmir.ac.in/#/administration;id=63D0002B-54E6-4B78-A142-63FF68FE6CBC",
  "https://www.cukashmir.ac.in/#/content;id=5EFC637D-0DAE-4B38-96DC-DE2C0FB3CFDC",
  "https://www.cukashmir.ac.in/#/departlist;id=5EFC637D-0DAE-4B38-96DC-DE2C0FB3CFDC",
  "https://www.cukashmir.ac.in/#/administration;id=5EFC637D-0DAE-4B38-96DC-DE2C0FB3CFDC",
  "https://www.cukashmir.ac.in/#/content;id=1AB43946-F452-414C-875D-6A59B3B76429",
  "https://www.cukashmir.ac.in/#/departlist;id=1AB43946-F452-414C-875D-6A59B3B76429",
  "https://www.cukashmir.ac.in/#/administration;id=1AB43946-F452-414C-875D-6A59B3B76429",
  "https://www.cukashmir.ac.in/#/content;id=5A5AC42F-6CEC-4350-B49E-E168524885B7",
  "https://www.cukashmir.ac.in/#/departlist;id=5A5AC42F-6CEC-4350-B49E-E168524885B7",
  "https://www.cukashmir.ac.in/#/administration;id=5A5AC42F-6CEC-4350-B49E-E168524885B7",
  "https://www.cukashmir.ac.in/#/content;id=B73612E0-205C-4D65-8971-7DBA5D6A39BC",
  "https://www.cukashmir.ac.in/#/departlist;id=B73612E0-205C-4D65-8971-7DBA5D6A39BC",
  "https://www.cukashmir.ac.in/#/administration;id=B73612E0-205C-4D65-8971-7DBA5D6A39BC",
  "https://www.cukashmir.ac.in/#/content;id=6AE2A4EC-E3EE-4ACF-8F67-F3C646E4EF02",
  "https://www.cukashmir.ac.in/#/departlist;id=6AE2A4EC-E3EE-4ACF-8F67-F3C646E4EF02",
  "https://www.cukashmir.ac.in/#/administration;id=6AE2A4EC-E3EE-4ACF-8F67-F3C646E4EF02",
  "https://www.cukashmir.ac.in/#/content;id=2E9CAC82-0689-407D-8FBC-9F7A87373F53",
  "https://www.cukashmir.ac.in/#/departlist;id=2E9CAC82-0689-407D-8FBC-9F7A87373F53",
  "https://www.cukashmir.ac.in/#/administration;id=2E9CAC82-0689-407D-8FBC-9F7A87373F53",
  "https://www.cukashmir.ac.in/#/content;id=7E41BEC8-03B7-404F-9025-258FAFAB1C2B",
  "https://www.cukashmir.ac.in/#/departlist;id=7E41BEC8-03B7-404F-9025-258FAFAB1C2B",
  "https://www.cukashmir.ac.in/#/administration;id=7E41BEC8-03B7-404F-9025-258FAFAB1C2B",
  "https://www.cukashmir.ac.in/#/content;id=DFE0C4B7-971F-437B-841E-B96CEACECF4A",
  "https://www.cukashmir.ac.in/#/departlist;id=DFE0C4B7-971F-437B-841E-B96CEACECF4A",
  "https://www.cukashmir.ac.in/#/administration;id=DFE0C4B7-971F-437B-841E-B96CEACECF4A",
  "https://www.cukashmir.ac.in/#/content;id=0B9B672D-8DD6-4EFC-8320-311610A419A4",
  "https://www.cukashmir.ac.in/#/departlist;id=0B9B672D-8DD6-4EFC-8320-311610A419A4",
  "https://www.cukashmir.ac.in/#/administration;id=0B9B672D-8DD6-4EFC-8320-311610A419A4",
  "https://www.cukashmir.ac.in/#/content;id=B375C0AE-10CE-44DC-8CFE-3572AB992194",
  "https://www.cukashmir.ac.in/#/departlist;id=B375C0AE-10CE-44DC-8CFE-3572AB992194",
  "https://www.cukashmir.ac.in/#/administration;id=B375C0AE-10CE-44DC-8CFE-3572AB992194",
  "https://www.cukashmir.ac.in/#/content;id=4934A99B-160F-471D-A24F-FB557B6DC0B9",
  "https://www.cukashmir.ac.in/#/departlist;id=4934A99B-160F-471D-A24F-FB557B6DC0B9",
  "https://www.cukashmir.ac.in/#/administration;id=4934A99B-160F-471D-A24F-FB557B6DC0B9",
  "https://www.cukashmir.ac.in/#/content;id=C11C5BFB-B8AA-4C4D-964A-4570FA340824",
  "https://www.cukashmir.ac.in/#/departlist;id=C11C5BFB-B8AA-4C4D-964A-4570FA340824",
  "https://www.cukashmir.ac.in/#/administration;id=C11C5BFB-B8AA-4C4D-964A-4570FA340824",
  "https://www.cukashmir.ac.in/#/content;id=DDAC93BD-AA6A-4393-9344-424DE8ABCF13",
  "https://www.cukashmir.ac.in/#/departlist;id=DDAC93BD-AA6A-4393-9344-424DE8ABCF13",
  "https://www.cukashmir.ac.in/#/administration;id=DDAC93BD-AA6A-4393-9344-424DE8ABCF13",
  "https://www.cukashmir.ac.in/#/content;id=A7C3535E-ABB6-4B19-88A7-494733506881",
  "https://www.cukashmir.ac.in/#/departlist;id=A7C3535E-ABB6-4B19-88A7-494733506881",
  "https://www.cukashmir.ac.in/#/administration;id=A7C3535E-ABB6-4B19-88A7-494733506881",
  "https://www.cukashmir.ac.in/#/content;id=0B3C1E4C-990D-4B37-82DE-593DB3FB74BE",
  "https://www.cukashmir.ac.in/#/departlist;id=0B3C1E4C-990D-4B37-82DE-593DB3FB74BE",
  "https://www.cukashmir.ac.in/#/administration;id=0B3C1E4C-990D-4B37-82DE-593DB3FB74BE",
  "https://www.cukashmir.ac.in/#/content;id=E156FF1C-6EF3-43E8-B817-8CF79D9977CE",
  "https://www.cukashmir.ac.in/#/departlist;id=E156FF1C-6EF3-43E8-B817-8CF79D9977CE",
  "https://www.cukashmir.ac.in/#/administration;id=E156FF1C-6EF3-43E8-B817-8CF79D9977CE",
  "https://www.cukashmir.ac.in/#/content;id=E7DA1062-893A-4F5F-807A-81D49D920EC9",
  "https://www.cukashmir.ac.in/#/departlist;id=E7DA1062-893A-4F5F-807A-81D49D920EC9",
  "https://www.cukashmir.ac.in/#/administration;id=E7DA1062-893A-4F5F-807A-81D49D920EC9",
  "https://www.cukashmir.ac.in/#/content;id=43BAD754-178E-4296-9BEA-D3CD7E3F02B9",
  "https://www.cukashmir.ac.in/#/departlist;id=43BAD754-178E-4296-9BEA-D3CD7E3F02B9",
  "https://www.cukashmir.ac.in/#/administration;id=43BAD754-178E-4296-9BEA-D3CD7E3F02B9",
  "https://www.cukashmir.ac.in/#/content;id=DDCBE701-10A3-40B6-827F-64D523E9926B",
  "https://www.cukashmir.ac.in/#/departlist;id=DDCBE701-10A3-40B6-827F-64D523E9926B",
  "https://www.cukashmir.ac.in/#/administration;id=DDCBE701-10A3-40B6-827F-64D523E9926B",
  "https://www.cukashmir.ac.in/#/content;id=4B415AB6-09FB-4E36-83C5-227855DFF52C",
  "https://www.cukashmir.ac.in/#/departlist;id=4B415AB6-09FB-4E36-83C5-227855DFF52C",
  "https://www.cukashmir.ac.in/#/administration;id=4B415AB6-09FB-4E36-83C5-227855DFF52C",
  "https://www.cukashmir.ac.in/#/content;id=C1D88614-E236-4C61-8CAB-EF2662B74155",
  "https://www.cukashmir.ac.in/#/departlist;id=C1D88614-E236-4C61-8CAB-EF2662B74155",
  "https://www.cukashmir.ac.in/#/administration;id=C1D88614-E236-4C61-8CAB-EF2662B74155",
  "https://www.cukashmir.ac.in/#/content;id=42FE4DF6-4D25-4AA2-9DE0-8CC2BA39C3AE",
  "https://www.cukashmir.ac.in/#/departlist;id=42FE4DF6-4D25-4AA2-9DE0-8CC2BA39C3AE",
  "https://www.cukashmir.ac.in/#/administration;id=42FE4DF6-4D25-4AA2-9DE0-8CC2BA39C3AE",
  "https://www.cukashmir.ac.in/#/content;id=AD0250C3-48A7-4338-BC4F-B12FFA5A33B6",
  "https://www.cukashmir.ac.in/#/departlist;id=AD0250C3-48A7-4338-BC4F-B12FFA5A33B6",
  "https://www.cukashmir.ac.in/#/administration;id=AD0250C3-48A7-4338-BC4F-B12FFA5A33B6",
  "https://www.cukashmir.ac.in/#/content;id=E11191E0-E31E-4B51-B54A-1F8C6C0CEA45",
  "https://www.cukashmir.ac.in/#/departlist;id=E11191E0-E31E-4B51-B54A-1F8C6C0CEA45",
  "https://www.cukashmir.ac.in/#/administration;id=E11191E0-E31E-4B51-B54A-1F8C6C0CEA45",
  "https://www.cukashmir.ac.in/#/content;id=AA5E42BA-0EF7-4C1F-9D31-31898599EE4C",
  "https://www.cukashmir.ac.in/#/departlist;id=AA5E42BA-0EF7-4C1F-9D31-31898599EE4C",
  "https://www.cukashmir.ac.in/#/administration;id=AA5E42BA-0EF7-4C1F-9D31-31898599EE4C",
  "https://www.cukashmir.ac.in/#/content;id=2A3943BD-9D33-4685-A83B-29FB2D1A302B",
  "https://www.cukashmir.ac.in/#/departlist;id=2A3943BD-9D33-4685-A83B-29FB2D1A302B",
  "https://www.cukashmir.ac.in/#/administration;id=2A3943BD-9D33-4685-A83B-29FB2D1A302B",
  "https://www.cukashmir.ac.in/#/content;id=0A378783-C06E-4DC9-9A79-9A9CCF06F346",
  "https://www.cukashmir.ac.in/#/departlist;id=0A378783-C06E-4DC9-9A79-9A9CCF06F346",
  "https://www.cukashmir.ac.in/#/administration;id=0A378783-C06E-4DC9-9A79-9A9CCF06F346",
  "https://www.cukashmir.ac.in/#/content;id=A48F0485-C70D-4AE7-A410-D856AB763D2B",
  "https://www.cukashmir.ac.in/#/departlist;id=A48F0485-C70D-4AE7-A410-D856AB763D2B",
  "https://www.cukashmir.ac.in/#/administration;id=A48F0485-C70D-4AE7-A410-D856AB763D2B",
  "https://www.cukashmir.ac.in/#/content;id=88D0BEEA-1C70-4293-88C4-3F9981318345",
  "https://www.cukashmir.ac.in/#/departlist;id=88D0BEEA-1C70-4293-88C4-3F9981318345",
  "https://www.cukashmir.ac.in/#/administration;id=88D0BEEA-1C70-4293-88C4-3F9981318345",
  "https://www.cukashmir.ac.in/#/content;id=327D1494-A763-4730-ABCC-7E6D9EAB41DD",
  "https://www.cukashmir.ac.in/#/departlist;id=327D1494-A763-4730-ABCC-7E6D9EAB41DD",
  "https://www.cukashmir.ac.in/#/administration;id=327D1494-A763-4730-ABCC-7E6D9EAB41DD",
  "https://www.cukashmir.ac.in/#/content;id=4BFB6424-DA9E-4B0C-9219-3570B26C1961",
  "https://www.cukashmir.ac.in/#/departlist;id=4BFB6424-DA9E-4B0C-9219-3570B26C1961",
  "https://www.cukashmir.ac.in/#/administration;id=4BFB6424-DA9E-4B0C-9219-3570B26C1961",
  "https://www.cukashmir.ac.in/#/content;id=42A1F22B-93C3-4188-9862-01168F911021",
  "https://www.cukashmir.ac.in/#/departlist;id=42A1F22B-93C3-4188-9862-01168F911021",
  "https://www.cukashmir.ac.in/#/administration;id=42A1F22B-93C3-4188-9862-01168F911021",
  "https://www.cukashmir.ac.in/#/content;id=DEBA8C4B-29C7-4BB8-BCC9-97CCE42357AC",
  "https://www.cukashmir.ac.in/#/departlist;id=DEBA8C4B-29C7-4BB8-BCC9-97CCE42357AC",
  "https://www.cukashmir.ac.in/#/administration;id=DEBA8C4B-29C7-4BB8-BCC9-97CCE42357AC",
  "https://www.cukashmir.ac.in/#/content;id=8F429662-0208-4EDE-A5F5-448D9DDD86CC",
  "https://www.cukashmir.ac.in/#/departlist;id=8F429662-0208-4EDE-A5F5-448D9DDD86CC",
  "https://www.cukashmir.ac.in/#/administration;id=8F429662-0208-4EDE-A5F5-448D9DDD86CC",
  "https://www.cukashmir.ac.in/#/content;id=299F9509-6C56-4E59-A0C9-7FD8787B622B",
  "https://www.cukashmir.ac.in/#/departlist;id=299F9509-6C56-4E59-A0C9-7FD8787B622B",
  "https://www.cukashmir.ac.in/#/administration;id=299F9509-6C56-4E59-A0C9-7FD8787B622B",
  "https://www.cukashmir.ac.in/#/content;id=58030088-D020-4E50-A8C4-BD97D035159D",
  "https://www.cukashmir.ac.in/#/departlist;id=58030088-D020-4E50-A8C4-BD97D035159D",
  "https://www.cukashmir.ac.in/#/administration;id=58030088-D020-4E50-A8C4-BD97D035159D",
  "https://www.cukashmir.ac.in/#/content;id=7DA73D64-4208-405B-A845-34F39D420129",
  "https://www.cukashmir.ac.in/#/departlist;id=7DA73D64-4208-405B-A845-34F39D420129",
  "https://www.cukashmir.ac.in/#/administration;id=7DA73D64-4208-405B-A845-34F39D420129",
  "https://www.cukashmir.ac.in/#/content;id=F6630C46-8F19-4FA6-8F7C-4AF9A28F83EA",
  "https://www.cukashmir.ac.in/#/departlist;id=F6630C46-8F19-4FA6-8F7C-4AF9A28F83EA",
  "https://www.cukashmir.ac.in/#/administration;id=F6630C46-8F19-4FA6-8F7C-4AF9A28F83EA",
  "https://www.cukashmir.ac.in/#/content;id=16A9DF16-31E8-4D8B-88C6-A108328CF1A2",
  "https://www.cukashmir.ac.in/#/departlist;id=16A9DF16-31E8-4D8B-88C6-A108328CF1A2",
  "https://www.cukashmir.ac.in/#/administration;id=16A9DF16-31E8-4D8B-88C6-A108328CF1A2",
  "https://www.cukashmir.ac.in/#/content;id=D11C7186-5D4B-4452-96F8-C919F9BC6AEF",
  "https://www.cukashmir.ac.in/#/departlist;id=D11C7186-5D4B-4452-96F8-C919F9BC6AEF",
  "https://www.cukashmir.ac.in/#/administration;id=D11C7186-5D4B-4452-96F8-C919F9BC6AEF",
  "https://www.cukashmir.ac.in/#/content;id=79E20757-543D-4F0F-B80E-2BC40E7794E3",
  "https://www.cukashmir.ac.in/#/departlist;id=79E20757-543D-4F0F-B80E-2BC40E7794E3",
  "https://www.cukashmir.ac.in/#/administration;id=79E20757-543D-4F0F-B80E-2BC40E7794E3",
  "https://www.cukashmir.ac.in/#/content;id=528CC7E5-C2B4-401C-9400-43581C6D060A",
  "https://www.cukashmir.ac.in/#/departlist;id=528CC7E5-C2B4-401C-9400-43581C6D060A",
  "https://www.cukashmir.ac.in/#/administration;id=528CC7E5-C2B4-401C-9400-43581C6D060A",
  "https://www.cukashmir.ac.in/#/content;id=859958F6-672A-48F7-8565-FA4659E5FC39",
  "https://www.cukashmir.ac.in/#/departlist;id=859958F6-672A-48F7-8565-FA4659E5FC39",
  "https://www.cukashmir.ac.in/#/administration;id=859958F6-672A-48F7-8565-FA4659E5FC39",
  "https://www.cukashmir.ac.in/#/content;id=0A0F2A62-604B-4ACD-A732-D2714A3A92BF",
  "https://www.cukashmir.ac.in/#/departlist;id=0A0F2A62-604B-4ACD-A732-D2714A3A92BF",
  "https://www.cukashmir.ac.in/#/administration;id=0A0F2A62-604B-4ACD-A732-D2714A3A92BF",
  "https://www.cukashmir.ac.in/#/content;id=5D232EFB-C25D-4971-B964-D1A8F8CD77AC",
  "https://www.cukashmir.ac.in/#/departlist;id=5D232EFB-C25D-4971-B964-D1A8F8CD77AC",
  "https://www.cukashmir.ac.in/#/administration;id=5D232EFB-C25D-4971-B964-D1A8F8CD77AC",
  "https://www.cukashmir.ac.in/#/content;id=2B0B8E95-7010-4D04-AC20-F4209EB7B458",
  "https://www.cukashmir.ac.in/#/departlist;id=2B0B8E95-7010-4D04-AC20-F4209EB7B458",
  "https://www.cukashmir.ac.in/#/administration;id=2B0B8E95-7010-4D04-AC20-F4209EB7B458",
  "https://www.cukashmir.ac.in/#/content;id=C4698DE8-FA82-4EC3-B8B2-6F7447768B9F",
  "https://www.cukashmir.ac.in/#/departlist;id=C4698DE8-FA82-4EC3-B8B2-6F7447768B9F",
  "https://www.cukashmir.ac.in/#/administration;id=C4698DE8-FA82-4EC3-B8B2-6F7447768B9F",
  "https://www.cukashmir.ac.in/#/content;id=CAA7E1E2-7211-4388-B672-18B0DA8C31F3",
  "https://www.cukashmir.ac.in/#/departlist;id=CAA7E1E2-7211-4388-B672-18B0DA8C31F3",
  "https://www.cukashmir.ac.in/#/administration;id=CAA7E1E2-7211-4388-B672-18B0DA8C31F3",
  "https://www.cukashmir.ac.in/#/content;id=67673AB5-FD68-4A8D-A5CB-32BD641FCAAE",
  "https://www.cukashmir.ac.in/#/departlist;id=67673AB5-FD68-4A8D-A5CB-32BD641FCAAE",
  "https://www.cukashmir.ac.in/#/administration;id=67673AB5-FD68-4A8D-A5CB-32BD641FCAAE",
  "https://www.cukashmir.ac.in/#/content;id=E8357B2D-6D43-4CA1-9A79-F6968CA70C2D",
  "https://www.cukashmir.ac.in/#/departlist;id=E8357B2D-6D43-4CA1-9A79-F6968CA70C2D",
  "https://www.cukashmir.ac.in/#/administration;id=E8357B2D-6D43-4CA1-9A79-F6968CA70C2D",
  "https://www.cukashmir.ac.in/#/content;id=CA409A49-80E6-48B8-8C5C-3A4D38477292",
  "https://www.cukashmir.ac.in/#/departlist;id=CA409A49-80E6-48B8-8C5C-3A4D38477292",
  "https://www.cukashmir.ac.in/#/administration;id=CA409A49-80E6-48B8-8C5C-3A4D38477292",
  "https://www.cukashmir.ac.in/#/content;id=E0969CF9-9AFD-438C-9CAF-586795D2C154",
  "https://www.cukashmir.ac.in/#/departlist;id=E0969CF9-9AFD-438C-9CAF-586795D2C154",
  "https://www.cukashmir.ac.in/#/administration;id=E0969CF9-9AFD-438C-9CAF-586795D2C154",
  "https://www.cukashmir.ac.in/#/content;id=D46A532B-2B8B-4135-8D05-48483C488AE9",
  "https://www.cukashmir.ac.in/#/departlist;id=D46A532B-2B8B-4135-8D05-48483C488AE9",
  "https://www.cukashmir.ac.in/#/administration;id=D46A532B-2B8B-4135-8D05-48483C488AE9",
  "https://www.cukashmir.ac.in/#/content;id=5DA880E7-7617-4A03-AFAB-A7FEDBDAB668",
  "https://www.cukashmir.ac.in/#/departlist;id=5DA880E7-7617-4A03-AFAB-A7FEDBDAB668",
  "https://www.cukashmir.ac.in/#/administration;id=5DA880E7-7617-4A03-AFAB-A7FEDBDAB668",
  "https://www.cukashmir.ac.in/#/content;id=487063E8-952E-4748-9D68-9735E3D2E841",
  "https://www.cukashmir.ac.in/#/departlist;id=487063E8-952E-4748-9D68-9735E3D2E841",
  "https://www.cukashmir.ac.in/#/administration;id=487063E8-952E-4748-9D68-9735E3D2E841",
  "https://www.cukashmir.ac.in/#/content;id=C3B79C98-599E-4BF6-B5A7-6327AB4649B3",
  "https://www.cukashmir.ac.in/#/departlist;id=C3B79C98-599E-4BF6-B5A7-6327AB4649B3",
  "https://www.cukashmir.ac.in/#/administration;id=C3B79C98-599E-4BF6-B5A7-6327AB4649B3",
  "https://www.cukashmir.ac.in/#/content;id=55A61844-3178-44CA-9EBE-9DBA12B3FE66",
  "https://www.cukashmir.ac.in/#/departlist;id=55A61844-3178-44CA-9EBE-9DBA12B3FE66",
  "https://www.cukashmir.ac.in/#/administration;id=55A61844-3178-44CA-9EBE-9DBA12B3FE66",
  "https://www.cukashmir.ac.in/#/content;id=C4C01B3F-F8E3-4719-A534-F3D73ADB091D",
  "https://www.cukashmir.ac.in/#/departlist;id=C4C01B3F-F8E3-4719-A534-F3D73ADB091D",
  "https://www.cukashmir.ac.in/#/administration;id=C4C01B3F-F8E3-4719-A534-F3D73ADB091D",
  "https://www.cukashmir.ac.in/#/content;id=60B07DB3-FFDB-4979-A59C-D0E2E9D3B897",
  "https://www.cukashmir.ac.in/#/departlist;id=60B07DB3-FFDB-4979-A59C-D0E2E9D3B897",
  "https://www.cukashmir.ac.in/#/administration;id=60B07DB3-FFDB-4979-A59C-D0E2E9D3B897",
  "https://www.cukashmir.ac.in/#/content;id=91979E2A-BF52-482A-91AF-FEB66254B471",
  "https://www.cukashmir.ac.in/#/departlist;id=91979E2A-BF52-482A-91AF-FEB66254B471",
  "https://www.cukashmir.ac.in/#/administration;id=91979E2A-BF52-482A-91AF-FEB66254B471",
  "https://www.cukashmir.ac.in/#/content;id=4EB2DA68-CFDC-406A-A27F-755465A7F8F4",
  "https://www.cukashmir.ac.in/#/departlist;id=4EB2DA68-CFDC-406A-A27F-755465A7F8F4",
  "https://www.cukashmir.ac.in/#/administration;id=4EB2DA68-CFDC-406A-A27F-755465A7F8F4",
  "https://www.cukashmir.ac.in/#/content;id=EFC5AA0C-8DB0-452F-99BB-C928EF17C24D",
  "https://www.cukashmir.ac.in/#/departlist;id=EFC5AA0C-8DB0-452F-99BB-C928EF17C24D",
  "https://www.cukashmir.ac.in/#/administration;id=EFC5AA0C-8DB0-452F-99BB-C928EF17C24D",
  "https://www.cukashmir.ac.in/#/content;id=BF459283-7B65-4E64-9C3B-D062CDCFA16A",
  "https://www.cukashmir.ac.in/#/departlist;id=BF459283-7B65-4E64-9C3B-D062CDCFA16A",
  "https://www.cukashmir.ac.in/#/administration;id=BF459283-7B65-4E64-9C3B-D062CDCFA16A",
  "https://www.cukashmir.ac.in/#/content;id=54B8E1B9-A207-4215-B711-808C698A47C1",
  "https://www.cukashmir.ac.in/#/departlist;id=54B8E1B9-A207-4215-B711-808C698A47C1",
  "https://www.cukashmir.ac.in/#/administration;id=54B8E1B9-A207-4215-B711-808C698A47C1",
  "https://www.cukashmir.ac.in/#/content;id=6CFBD3A2-C53D-47A6-B88C-E2CAF3527331",
  "https://www.cukashmir.ac.in/#/departlist;id=6CFBD3A2-C53D-47A6-B88C-E2CAF3527331",
  "https://www.cukashmir.ac.in/#/administration;id=6CFBD3A2-C53D-47A6-B88C-E2CAF3527331",
  "https://www.cukashmir.ac.in/#/content;id=95353237-CDCC-4830-B2E4-B29DD9337BA6",
  "https://www.cukashmir.ac.in/#/departlist;id=95353237-CDCC-4830-B2E4-B29DD9337BA6",
  "https://www.cukashmir.ac.in/#/administration;id=95353237-CDCC-4830-B2E4-B29DD9337BA6",
  "https://www.cukashmir.ac.in/#/content;id=AE1A7FFB-4401-433D-9A66-3E3CFADAD24E",
  "https://www.cukashmir.ac.in/#/departlist;id=AE1A7FFB-4401-433D-9A66-3E3CFADAD24E",
  "https://www.cukashmir.ac.in/#/administration;id=AE1A7FFB-4401-433D-9A66-3E3CFADAD24E",
  "https://www.cukashmir.ac.in/#/content;id=145E1269-3A95-4A6F-A176-B2B20312FC5E",
  "https://www.cukashmir.ac.in/#/departlist;id=145E1269-3A95-4A6F-A176-B2B20312FC5E",
  "https://www.cukashmir.ac.in/#/administration;id=145E1269-3A95-4A6F-A176-B2B20312FC5E",
  "https://www.cukashmir.ac.in/#/content;id=08C9A653-FCD0-4235-8B59-523479A88F5C",
  "https://www.cukashmir.ac.in/#/departlist;id=08C9A653-FCD0-4235-8B59-523479A88F5C",
  "https://www.cukashmir.ac.in/#/administration;id=08C9A653-FCD0-4235-8B59-523479A88F5C",
  "https://www.cukashmir.ac.in/#/content;id=DEA1841C-01FA-4489-8179-17C569732101",
  "https://www.cukashmir.ac.in/#/departlist;id=DEA1841C-01FA-4489-8179-17C569732101",
  "https://www.cukashmir.ac.in/#/administration;id=DEA1841C-01FA-4489-8179-17C569732101",
  "https://www.cukashmir.ac.in/#/content;id=DD241D7A-AE6C-469B-9352-099B4F90CD0F",
  "https://www.cukashmir.ac.in/#/departlist;id=DD241D7A-AE6C-469B-9352-099B4F90CD0F",
  "https://www.cukashmir.ac.in/#/administration;id=DD241D7A-AE6C-469B-9352-099B4F90CD0F",
  "https://www.cukashmir.ac.in/#/content;id=6AD0FBC3-596F-4588-A9C0-6FB068AA7886",
  "https://www.cukashmir.ac.in/#/departlist;id=6AD0FBC3-596F-4588-A9C0-6FB068AA7886",
  "https://www.cukashmir.ac.in/#/administration;id=6AD0FBC3-596F-4588-A9C0-6FB068AA7886",
  "https://www.cukashmir.ac.in/#/content;id=297317CD-8519-4D06-9A76-D08D862CC65D",
  "https://www.cukashmir.ac.in/#/departlist;id=297317CD-8519-4D06-9A76-D08D862CC65D",
  "https://www.cukashmir.ac.in/#/administration;id=297317CD-8519-4D06-9A76-D08D862CC65D",
  "https://www.cukashmir.ac.in/#/content;id=D7374161-D19B-4A70-AEBA-2E3B4A045C52",
  "https://www.cukashmir.ac.in/#/departlist;id=D7374161-D19B-4A70-AEBA-2E3B4A045C52",
  "https://www.cukashmir.ac.in/#/administration;id=D7374161-D19B-4A70-AEBA-2E3B4A045C52",
  "https://www.cukashmir.ac.in/#/content;id=5E57D0F7-EF8D-41D6-9961-AC1D1B032282",
  "https://www.cukashmir.ac.in/#/departlist;id=5E57D0F7-EF8D-41D6-9961-AC1D1B032282",
  "https://www.cukashmir.ac.in/#/administration;id=5E57D0F7-EF8D-41D6-9961-AC1D1B032282",
  "https://www.cukashmir.ac.in/#/content;id=AA673FB8-5D99-4199-8309-A5365788CBCD",
  "https://www.cukashmir.ac.in/#/departlist;id=AA673FB8-5D99-4199-8309-A5365788CBCD",
  "https://www.cukashmir.ac.in/#/administration;id=AA673FB8-5D99-4199-8309-A5365788CBCD",
  "https://www.cukashmir.ac.in/#/content;id=EC3C0EE9-98FD-4541-957A-E3D3183C0A3A",
  "https://www.cukashmir.ac.in/#/departlist;id=EC3C0EE9-98FD-4541-957A-E3D3183C0A3A",
  "https://www.cukashmir.ac.in/#/administration;id=EC3C0EE9-98FD-4541-957A-E3D3183C0A3A",
  "https://www.cukashmir.ac.in/#/content;id=C87CFAC6-FF3D-49F1-AF50-7B1A6C80C9C8",
  "https://www.cukashmir.ac.in/#/departlist;id=C87CFAC6-FF3D-49F1-AF50-7B1A6C80C9C8",
  "https://www.cukashmir.ac.in/#/administration;id=C87CFAC6-FF3D-49F1-AF50-7B1A6C80C9C8",
  "https://www.cukashmir.ac.in/#/content;id=367DC8AA-C179-48FD-9956-576BB934A9AE",
  "https://www.cukashmir.ac.in/#/departlist;id=367DC8AA-C179-48FD-9956-576BB934A9AE",
  "https://www.cukashmir.ac.in/#/administration;id=367DC8AA-C179-48FD-9956-576BB934A9AE",
  "https://www.cukashmir.ac.in/#/content;id=0541625F-CC4F-4C09-986B-B53267B6DFC8",
  "https://www.cukashmir.ac.in/#/departlist;id=0541625F-CC4F-4C09-986B-B53267B6DFC8",
  "https://www.cukashmir.ac.in/#/administration;id=0541625F-CC4F-4C09-986B-B53267B6DFC8",
  "https://www.cukashmir.ac.in/#/content;id=B526BA42-7ED6-4A60-94EB-6701BE83F0DD",
  "https://www.cukashmir.ac.in/#/departlist;id=B526BA42-7ED6-4A60-94EB-6701BE83F0DD",
  "https://www.cukashmir.ac.in/#/administration;id=B526BA42-7ED6-4A60-94EB-6701BE83F0DD",
  "https://www.cukashmir.ac.in/#/content;id=9DAE61B4-D346-462F-B09B-95D28D798FF7",
  "https://www.cukashmir.ac.in/#/departlist;id=9DAE61B4-D346-462F-B09B-95D28D798FF7",
  "https://www.cukashmir.ac.in/#/administration;id=9DAE61B4-D346-462F-B09B-95D28D798FF7",
  "https://www.cukashmir.ac.in/#/content;id=90959505-411B-40B7-8D6C-8B278A556DFC",
  "https://www.cukashmir.ac.in/#/departlist;id=90959505-411B-40B7-8D6C-8B278A556DFC",
  "https://www.cukashmir.ac.in/#/administration;id=90959505-411B-40B7-8D6C-8B278A556DFC",
  "https://www.cukashmir.ac.in/#/content;id=25D2DF02-47A8-4BCD-990E-B5F02026AAD1",
  "https://www.cukashmir.ac.in/#/departlist;id=25D2DF02-47A8-4BCD-990E-B5F02026AAD1",
  "https://www.cukashmir.ac.in/#/administration;id=25D2DF02-47A8-4BCD-990E-B5F02026AAD1",
  "https://www.cukashmir.ac.in/#/content;id=9C9D68A1-4BCF-4BEB-A20C-36483C0C89E9",
  "https://www.cukashmir.ac.in/#/departlist;id=9C9D68A1-4BCF-4BEB-A20C-36483C0C89E9",
  "https://www.cukashmir.ac.in/#/administration;id=9C9D68A1-4BCF-4BEB-A20C-36483C0C89E9",
  "https://www.cukashmir.ac.in/#/content;id=CA6B451E-78AC-4F34-9D7C-F1F2A67506A9",
  "https://www.cukashmir.ac.in/#/departlist;id=CA6B451E-78AC-4F34-9D7C-F1F2A67506A9",
  "https://www.cukashmir.ac.in/#/administration;id=CA6B451E-78AC-4F34-9D7C-F1F2A67506A9",
  "https://www.cukashmir.ac.in/#/content;id=9EB2C8C5-0593-40E9-BBD3-94FA0C96D886",
  "https://www.cukashmir.ac.in/#/departlist;id=9EB2C8C5-0593-40E9-BBD3-94FA0C96D886",
  "https://www.cukashmir.ac.in/#/administration;id=9EB2C8C5-0593-40E9-BBD3-94FA0C96D886",
  "https://www.cukashmir.ac.in/#/content;id=D65E3D66-6577-493B-983C-2B1F02BE72D9",
  "https://www.cukashmir.ac.in/#/departlist;id=D65E3D66-6577-493B-983C-2B1F02BE72D9",
  "https://www.cukashmir.ac.in/#/administration;id=D65E3D66-6577-493B-983C-2B1F02BE72D9",
  "https://www.cukashmir.ac.in/#/content;id=231E1654-D856-4AFB-A1B7-2328A6042DAA",
  "https://www.cukashmir.ac.in/#/departlist;id=231E1654-D856-4AFB-A1B7-2328A6042DAA",
  "https://www.cukashmir.ac.in/#/administration;id=231E1654-D856-4AFB-A1B7-2328A6042DAA",
  "https://www.cukashmir.ac.in/#/content;id=182BE39E-6E41-4878-A21E-B7469E1672B9",
  "https://www.cukashmir.ac.in/#/departlist;id=182BE39E-6E41-4878-A21E-B7469E1672B9",
  "https://www.cukashmir.ac.in/#/administration;id=182BE39E-6E41-4878-A21E-B7469E1672B9",
  "https://www.cukashmir.ac.in/#/content;id=0FF4D33A-5D6A-48ED-A066-C4C5EB313496",
  "https://www.cukashmir.ac.in/#/departlist;id=0FF4D33A-5D6A-48ED-A066-C4C5EB313496",
  "https://www.cukashmir.ac.in/#/administration;id=0FF4D33A-5D6A-48ED-A066-C4C5EB313496",
  "https://www.cukashmir.ac.in/#/content;id=224E6450-DD62-49BC-BAD9-E7A9194158BB",
  "https://www.cukashmir.ac.in/#/departlist;id=224E6450-DD62-49BC-BAD9-E7A9194158BB",
  "https://www.cukashmir.ac.in/#/administration;id=224E6450-DD62-49BC-BAD9-E7A9194158BB",
  "https://www.cukashmir.ac.in/#/content;id=C88A8002-EDEF-4FA4-9273-46D93E6292FE",
  "https://www.cukashmir.ac.in/#/departlist;id=C88A8002-EDEF-4FA4-9273-46D93E6292FE",
  "https://www.cukashmir.ac.in/#/administration;id=C88A8002-EDEF-4FA4-9273-46D93E6292FE",
  "https://www.cukashmir.ac.in/#/content;id=EA3A6D53-34BA-406D-8126-C722AF78F5C0",
  "https://www.cukashmir.ac.in/#/departlist;id=EA3A6D53-34BA-406D-8126-C722AF78F5C0",
  "https://www.cukashmir.ac.in/#/administration;id=EA3A6D53-34BA-406D-8126-C722AF78F5C0",
  "https://www.cukashmir.ac.in/#/content;id=BC0E11BB-A5F7-4AD4-BB2E-04C13583B53E",
  "https://www.cukashmir.ac.in/#/departlist;id=BC0E11BB-A5F7-4AD4-BB2E-04C13583B53E",
  "https://www.cukashmir.ac.in/#/administration;id=BC0E11BB-A5F7-4AD4-BB2E-04C13583B53E",
  "https://www.cukashmir.ac.in/#/content;id=FC0E5BD5-9C9D-4B8E-9554-73150C30C77D",
  "https://www.cukashmir.ac.in/#/departlist;id=FC0E5BD5-9C9D-4B8E-9554-73150C30C77D",
  "https://www.cukashmir.ac.in/#/administration;id=FC0E5BD5-9C9D-4B8E-9554-73150C30C77D",
  "https://www.cukashmir.ac.in/#/content;id=B0DCC355-375C-413F-9B7F-89C038FD4A25",
  "https://www.cukashmir.ac.in/#/departlist;id=B0DCC355-375C-413F-9B7F-89C038FD4A25",
  "https://www.cukashmir.ac.in/#/administration;id=B0DCC355-375C-413F-9B7F-89C038FD4A25",
  "https://www.cukashmir.ac.in/#/content;id=03AB9670-4E1E-4775-A6CB-946A7CD35ABC",
  "https://www.cukashmir.ac.in/#/departlist;id=03AB9670-4E1E-4775-A6CB-946A7CD35ABC",
  "https://www.cukashmir.ac.in/#/administration;id=03AB9670-4E1E-4775-A6CB-946A7CD35ABC",
  "https://www.cukashmir.ac.in/#/content;id=533BDA7E-75C0-45FD-A1E9-089B51C26FE6",
  "https://www.cukashmir.ac.in/#/departlist;id=533BDA7E-75C0-45FD-A1E9-089B51C26FE6",
  "https://www.cukashmir.ac.in/#/administration;id=533BDA7E-75C0-45FD-A1E9-089B51C26FE6",
  "https://www.cukashmir.ac.in/#/content;id=46067A10-3456-4DD6-A2E8-1FFE56E04685",
  "https://www.cukashmir.ac.in/#/departlist;id=46067A10-3456-4DD6-A2E8-1FFE56E04685",
  "https://www.cukashmir.ac.in/#/administration;id=46067A10-3456-4DD6-A2E8-1FFE56E04685",
  "https://www.cukashmir.ac.in/#/content;id=24EC549F-C0D3-419E-A8AF-CC78E2C2818A",
  "https://www.cukashmir.ac.in/#/departlist;id=24EC549F-C0D3-419E-A8AF-CC78E2C2818A",
  "https://www.cukashmir.ac.in/#/administration;id=24EC549F-C0D3-419E-A8AF-CC78E2C2818A",
  "https://www.cukashmir.ac.in/#/content;id=A6EE0A12-365E-46BF-833C-DE46B928BA5E",
  "https://www.cukashmir.ac.in/#/departlist;id=A6EE0A12-365E-46BF-833C-DE46B928BA5E",
  "https://www.cukashmir.ac.in/#/administration;id=A6EE0A12-365E-46BF-833C-DE46B928BA5E",
  "https://www.cukashmir.ac.in/#/content;id=D7B4E077-C336-4586-8194-2616AE3A0A8D",
  "https://www.cukashmir.ac.in/#/departlist;id=D7B4E077-C336-4586-8194-2616AE3A0A8D",
  "https://www.cukashmir.ac.in/#/administration;id=D7B4E077-C336-4586-8194-2616AE3A0A8D",
  "https://www.cukashmir.ac.in/#/content;id=5CED0996-E698-4023-B4B4-2ACAD4889073",
  "https://www.cukashmir.ac.in/#/departlist;id=5CED0996-E698-4023-B4B4-2ACAD4889073",
  "https://www.cukashmir.ac.in/#/administration;id=5CED0996-E698-4023-B4B4-2ACAD4889073",
  "https://www.cukashmir.ac.in/#/content;id=ADCBD94A-8102-4D20-B753-7A0A7B16E682",
  "https://www.cukashmir.ac.in/#/departlist;id=ADCBD94A-8102-4D20-B753-7A0A7B16E682",
  "https://www.cukashmir.ac.in/#/administration;id=ADCBD94A-8102-4D20-B753-7A0A7B16E682",
  "https://www.cukashmir.ac.in/#/content;id=4E2E4BFB-6ED7-4577-A022-B6DAF79C0CFD",
  "https://www.cukashmir.ac.in/#/departlist;id=4E2E4BFB-6ED7-4577-A022-B6DAF79C0CFD",
  "https://www.cukashmir.ac.in/#/administration;id=4E2E4BFB-6ED7-4577-A022-B6DAF79C0CFD",
  "https://www.cukashmir.ac.in/#/content;id=8C95890E-85B6-4DBF-83A6-2617B2BC83FB",
  "https://www.cukashmir.ac.in/#/departlist;id=8C95890E-85B6-4DBF-83A6-2617B2BC83FB",
  "https://www.cukashmir.ac.in/#/administration;id=8C95890E-85B6-4DBF-83A6-2617B2BC83FB",
  "https://www.cukashmir.ac.in/#/content;id=D22640A8-C640-4D36-8211-7F169771B831",
  "https://www.cukashmir.ac.in/#/departlist;id=D22640A8-C640-4D36-8211-7F169771B831",
  "https://www.cukashmir.ac.in/#/administration;id=D22640A8-C640-4D36-8211-7F169771B831",
  "https://www.cukashmir.ac.in/#/content;id=BB313B91-166B-4BE8-9704-37C3C3962F0B",
  "https://www.cukashmir.ac.in/#/departlist;id=BB313B91-166B-4BE8-9704-37C3C3962F0B",
  "https://www.cukashmir.ac.in/#/administration;id=BB313B91-166B-4BE8-9704-37C3C3962F0B",
  "https://www.cukashmir.ac.in/#/content;id=C5633A38-7659-413E-A7CB-1FD7BACF57A5",
  "https://www.cukashmir.ac.in/#/departlist;id=C5633A38-7659-413E-A7CB-1FD7BACF57A5",
  "https://www.cukashmir.ac.in/#/administration;id=C5633A38-7659-413E-A7CB-1FD7BACF57A5",
  "https://www.cukashmir.ac.in/#/content;id=25252D51-4D18-444F-A2CA-03FBE8BE3061",
  "https://www.cukashmir.ac.in/#/departlist;id=25252D51-4D18-444F-A2CA-03FBE8BE3061",
  "https://www.cukashmir.ac.in/#/administration;id=25252D51-4D18-444F-A2CA-03FBE8BE3061",
  "https://www.cukashmir.ac.in/#/content;id=B31A3D53-1F1F-4C3E-A9D1-D18F8A975491",
  "https://www.cukashmir.ac.in/#/departlist;id=B31A3D53-1F1F-4C3E-A9D1-D18F8A975491",
  "https://www.cukashmir.ac.in/#/administration;id=B31A3D53-1F1F-4C3E-A9D1-D18F8A975491",
  "https://www.cukashmir.ac.in/#/content;id=8163FF32-78DF-4A58-BEE6-9FCB8B806E3E",
  "https://www.cukashmir.ac.in/#/departlist;id=8163FF32-78DF-4A58-BEE6-9FCB8B806E3E",
  "https://www.cukashmir.ac.in/#/administration;id=8163FF32-78DF-4A58-BEE6-9FCB8B806E3E",
  "https://www.cukashmir.ac.in/#/content;id=48970E5B-794D-443B-9EEA-6D0E40E74956",
  "https://www.cukashmir.ac.in/#/departlist;id=48970E5B-794D-443B-9EEA-6D0E40E74956",
  "https://www.cukashmir.ac.in/#/administration;id=48970E5B-794D-443B-9EEA-6D0E40E74956",
  "https://www.cukashmir.ac.in/#/content;id=5F9EC85E-DC29-4FBC-B1DF-A8739A18FBD8",
  "https://www.cukashmir.ac.in/#/departlist;id=5F9EC85E-DC29-4FBC-B1DF-A8739A18FBD8",
  "https://www.cukashmir.ac.in/#/administration;id=5F9EC85E-DC29-4FBC-B1DF-A8739A18FBD8",
  "https://www.cukashmir.ac.in/#/content;id=2B791B5C-A7EF-40BC-894D-6658DC3EADC9",
  "https://www.cukashmir.ac.in/#/departlist;id=2B791B5C-A7EF-40BC-894D-6658DC3EADC9",
  "https://www.cukashmir.ac.in/#/administration;id=2B791B5C-A7EF-40BC-894D-6658DC3EADC9",
  "https://www.cukashmir.ac.in/#/content;id=EB8ABEE9-D751-4A19-BD01-B175B283CF91",
  "https://www.cukashmir.ac.in/#/departlist;id=EB8ABEE9-D751-4A19-BD01-B175B283CF91",
  "https://www.cukashmir.ac.in/#/administration;id=EB8ABEE9-D751-4A19-BD01-B175B283CF91",
  "https://www.cukashmir.ac.in/#/content;id=85C8FB26-B384-4AA0-A7E0-9A1F15E9BBF2",
  "https://www.cukashmir.ac.in/#/departlist;id=85C8FB26-B384-4AA0-A7E0-9A1F15E9BBF2",
  "https://www.cukashmir.ac.in/#/administration;id=85C8FB26-B384-4AA0-A7E0-9A1F15E9BBF2",
  "https://www.cukashmir.ac.in/#/content;id=1DD40410-93E0-4517-BA90-96323EF11C76",
  "https://www.cukashmir.ac.in/#/departlist;id=1DD40410-93E0-4517-BA90-96323EF11C76",
  "https://www.cukashmir.ac.in/#/administration;id=1DD40410-93E0-4517-BA90-96323EF11C76",
  "https://www.cukashmir.ac.in/#/content;id=ED252E03-0AA6-4961-9AE1-A78CF10CCDE2",
  "https://www.cukashmir.ac.in/#/departlist;id=ED252E03-0AA6-4961-9AE1-A78CF10CCDE2",
  "https://www.cukashmir.ac.in/#/administration;id=ED252E03-0AA6-4961-9AE1-A78CF10CCDE2",
  "https://www.cukashmir.ac.in/#/content;id=17D31A44-05F4-4186-A513-F8624D0129F8",
  "https://www.cukashmir.ac.in/#/departlist;id=17D31A44-05F4-4186-A513-F8624D0129F8",
  "https://www.cukashmir.ac.in/#/administration;id=17D31A44-05F4-4186-A513-F8624D0129F8",
  "https://www.cukashmir.ac.in/#/content;id=76CC13E7-1DDD-4A82-A194-FDFBA9F7A8D9",
  "https://www.cukashmir.ac.in/#/departlist;id=76CC13E7-1DDD-4A82-A194-FDFBA9F7A8D9",
  "https://www.cukashmir.ac.in/#/administration;id=76CC13E7-1DDD-4A82-A194-FDFBA9F7A8D9",
  "https://www.cukashmir.ac.in/#/content;id=8A6FC16F-BC1E-47D8-8CFF-3DC1DF0D532A",
  "https://www.cukashmir.ac.in/#/departlist;id=8A6FC16F-BC1E-47D8-8CFF-3DC1DF0D532A",
  "https://www.cukashmir.ac.in/#/administration;id=8A6FC16F-BC1E-47D8-8CFF-3DC1DF0D532A",
  "https://www.cukashmir.ac.in/#/content;id=1BC4E4A2-B385-4903-B141-82557B6217A0",
  "https://www.cukashmir.ac.in/#/departlist;id=1BC4E4A2-B385-4903-B141-82557B6217A0",
  "https://www.cukashmir.ac.in/#/administration;id=1BC4E4A2-B385-4903-B141-82557B6217A0",
  "https://www.cukashmir.ac.in/#/content;id=82409A3D-C72C-44B3-98CB-5DD0793AA224",
  "https://www.cukashmir.ac.in/#/departlist;id=82409A3D-C72C-44B3-98CB-5DD0793AA224",
  "https://www.cukashmir.ac.in/#/administration;id=82409A3D-C72C-44B3-98CB-5DD0793AA224",
  "https://www.cukashmir.ac.in/#/content;id=44F7A29B-1F77-4461-8608-767955D96967",
  "https://www.cukashmir.ac.in/#/departlist;id=44F7A29B-1F77-4461-8608-767955D96967",
  "https://www.cukashmir.ac.in/#/administration;id=44F7A29B-1F77-4461-8608-767955D96967",
  "https://www.cukashmir.ac.in/#/content;id=5AB24A71-D5D1-4D9D-88D6-90D1F74EBA99",
  "https://www.cukashmir.ac.in/#/departlist;id=5AB24A71-D5D1-4D9D-88D6-90D1F74EBA99",
  "https://www.cukashmir.ac.in/#/administration;id=5AB24A71-D5D1-4D9D-88D6-90D1F74EBA99",
  "https://www.cukashmir.ac.in/#/content;id=782C3452-7BD4-46CD-A30B-022A482F00D8",
  "https://www.cukashmir.ac.in/#/departlist;id=782C3452-7BD4-46CD-A30B-022A482F00D8",
  "https://www.cukashmir.ac.in/#/administration;id=782C3452-7BD4-46CD-A30B-022A482F00D8",
  "https://www.cukashmir.ac.in/#/content;id=70C7EB29-29D3-4E19-8117-F9E1183EC848",
  "https://www.cukashmir.ac.in/#/departlist;id=70C7EB29-29D3-4E19-8117-F9E1183EC848",
  "https://www.cukashmir.ac.in/#/administration;id=70C7EB29-29D3-4E19-8117-F9E1183EC848",
  "https://www.cukashmir.ac.in/#/content;id=560255DA-C15D-40FF-B88B-F1520F89BABB",
  "https://www.cukashmir.ac.in/#/departlist;id=560255DA-C15D-40FF-B88B-F1520F89BABB",
  "https://www.cukashmir.ac.in/#/administration;id=560255DA-C15D-40FF-B88B-F1520F89BABB",
  "https://www.cukashmir.ac.in/#/content;id=99A912CB-E946-4630-B822-56BA4299502C",
  "https://www.cukashmir.ac.in/#/departlist;id=99A912CB-E946-4630-B822-56BA4299502C",
  "https://www.cukashmir.ac.in/#/administration;id=99A912CB-E946-4630-B822-56BA4299502C",
  "https://www.cukashmir.ac.in/#/content;id=E58271A7-0F33-42F3-9D4E-6AFE8F13362D",
  "https://www.cukashmir.ac.in/#/departlist;id=E58271A7-0F33-42F3-9D4E-6AFE8F13362D",
  "https://www.cukashmir.ac.in/#/administration;id=E58271A7-0F33-42F3-9D4E-6AFE8F13362D",
  "https://www.cukashmir.ac.in/#/content;id=1086C1CF-39B2-41E8-80D9-245AC0C7C76C",
  "https://www.cukashmir.ac.in/#/departlist;id=1086C1CF-39B2-41E8-80D9-245AC0C7C76C",
  "https://www.cukashmir.ac.in/#/administration;id=1086C1CF-39B2-41E8-80D9-245AC0C7C76C",
  "https://www.cukashmir.ac.in/#/content;id=EFCD539F-5C6C-4B2B-83E8-96C90808B77C",
  "https://www.cukashmir.ac.in/#/departlist;id=EFCD539F-5C6C-4B2B-83E8-96C90808B77C",
  "https://www.cukashmir.ac.in/#/administration;id=EFCD539F-5C6C-4B2B-83E8-96C90808B77C",
  "https://www.cukashmir.ac.in/#/content;id=F273AFDA-16B0-43FC-AEDE-20CDC55E29B6",
  "https://www.cukashmir.ac.in/#/departlist;id=F273AFDA-16B0-43FC-AEDE-20CDC55E29B6",
  "https://www.cukashmir.ac.in/#/administration;id=F273AFDA-16B0-43FC-AEDE-20CDC55E29B6",
  "https://www.cukashmir.ac.in/#/content;id=B08F1646-232B-4804-BD79-6FD1BC4AC6D2",
  "https://www.cukashmir.ac.in/#/departlist;id=B08F1646-232B-4804-BD79-6FD1BC4AC6D2",
  "https://www.cukashmir.ac.in/#/administration;id=B08F1646-232B-4804-BD79-6FD1BC4AC6D2",
  "https://www.cukashmir.ac.in/#/content;id=142CF71A-7885-45DF-8FAB-2A1DAABF32C5",
  "https://www.cukashmir.ac.in/#/departlist;id=142CF71A-7885-45DF-8FAB-2A1DAABF32C5",
  "https://www.cukashmir.ac.in/#/administration;id=142CF71A-7885-45DF-8FAB-2A1DAABF32C5",
  "https://www.cukashmir.ac.in/#/content;id=349CA973-9097-4A3C-979F-78C0E91CC0B7",
  "https://www.cukashmir.ac.in/#/departlist;id=349CA973-9097-4A3C-979F-78C0E91CC0B7",
  "https://www.cukashmir.ac.in/#/administration;id=349CA973-9097-4A3C-979F-78C0E91CC0B7",
  "https://www.cukashmir.ac.in/#/content;id=E2F051C2-3004-48DE-BCAD-4E58C9D51A53",
  "https://www.cukashmir.ac.in/#/departlist;id=E2F051C2-3004-48DE-BCAD-4E58C9D51A53",
  "https://www.cukashmir.ac.in/#/administration;id=E2F051C2-3004-48DE-BCAD-4E58C9D51A53",
  "https://www.cukashmir.ac.in/#/content;id=FAAF6C78-C782-497C-A1F3-A55E3BF71F17",
  "https://www.cukashmir.ac.in/#/departlist;id=FAAF6C78-C782-497C-A1F3-A55E3BF71F17",
  "https://www.cukashmir.ac.in/#/administration;id=FAAF6C78-C782-497C-A1F3-A55E3BF71F17",
  "https://www.cukashmir.ac.in/#/content;id=37F0C3C1-3FE3-4D1D-B5C0-3EF0776A535D",
  "https://www.cukashmir.ac.in/#/departlist;id=37F0C3C1-3FE3-4D1D-B5C0-3EF0776A535D",
  "https://www.cukashmir.ac.in/#/administration;id=37F0C3C1-3FE3-4D1D-B5C0-3EF0776A535D",
  "https://www.cukashmir.ac.in/#/content;id=BD1C6EDA-CAF9-4788-B788-84724FBB4E56",
  "https://www.cukashmir.ac.in/#/departlist;id=BD1C6EDA-CAF9-4788-B788-84724FBB4E56",
  "https://www.cukashmir.ac.in/#/administration;id=BD1C6EDA-CAF9-4788-B788-84724FBB4E56",
  "https://www.cukashmir.ac.in/#/content;id=591E6678-B92E-4A35-9468-FB79A3E41851",
  "https://www.cukashmir.ac.in/#/departlist;id=591E6678-B92E-4A35-9468-FB79A3E41851",
  "https://www.cukashmir.ac.in/#/administration;id=591E6678-B92E-4A35-9468-FB79A3E41851",
  "https://www.cukashmir.ac.in/#/content;id=8DDF877D-CDE6-4716-AE4D-5C9E48CFFF72",
  "https://www.cukashmir.ac.in/#/departlist;id=8DDF877D-CDE6-4716-AE4D-5C9E48CFFF72",
  "https://www.cukashmir.ac.in/#/administration;id=8DDF877D-CDE6-4716-AE4D-5C9E48CFFF72",
  "https://www.cukashmir.ac.in/#/content;id=1C8158E9-9BE4-4DFD-B75D-341B0AA1DA87",
  "https://www.cukashmir.ac.in/#/departlist;id=1C8158E9-9BE4-4DFD-B75D-341B0AA1DA87",
  "https://www.cukashmir.ac.in/#/administration;id=1C8158E9-9BE4-4DFD-B75D-341B0AA1DA87",
  "https://www.cukashmir.ac.in/#/content;id=3296AA8E-8781-42F7-8263-1A0C99B0BBAA",
  "https://www.cukashmir.ac.in/#/departlist;id=3296AA8E-8781-42F7-8263-1A0C99B0BBAA",
  "https://www.cukashmir.ac.in/#/administration;id=3296AA8E-8781-42F7-8263-1A0C99B0BBAA",
  "https://www.cukashmir.ac.in/#/content;id=87B7505A-94BF-4841-B9EC-60CB0387BE6D",
  "https://www.cukashmir.ac.in/#/departlist;id=87B7505A-94BF-4841-B9EC-60CB0387BE6D",
  "https://www.cukashmir.ac.in/#/administration;id=87B7505A-94BF-4841-B9EC-60CB0387BE6D",
  "https://www.cukashmir.ac.in/#/content;id=DD9D0839-2512-4BBF-8AEB-3A8FA14CBE77",
  "https://www.cukashmir.ac.in/#/departlist;id=DD9D0839-2512-4BBF-8AEB-3A8FA14CBE77",
  "https://www.cukashmir.ac.in/#/administration;id=DD9D0839-2512-4BBF-8AEB-3A8FA14CBE77",
  "https://www.cukashmir.ac.in/#/content;id=06B140EE-BDCD-4445-AA60-370E4E99AF7F",
  "https://www.cukashmir.ac.in/#/departlist;id=06B140EE-BDCD-4445-AA60-370E4E99AF7F",
  "https://www.cukashmir.ac.in/#/administration;id=06B140EE-BDCD-4445-AA60-370E4E99AF7F",
  "https://www.cukashmir.ac.in/#/content;id=6DEFFF0C-A01A-484B-AEAF-589C920660D7",
  "https://www.cukashmir.ac.in/#/departlist;id=6DEFFF0C-A01A-484B-AEAF-589C920660D7",
  "https://www.cukashmir.ac.in/#/administration;id=6DEFFF0C-A01A-484B-AEAF-589C920660D7",
  "https://www.cukashmir.ac.in/#/content;id=23B351AF-9416-40B3-9649-20D388A45E80",
  "https://www.cukashmir.ac.in/#/departlist;id=23B351AF-9416-40B3-9649-20D388A45E80",
  "https://www.cukashmir.ac.in/#/administration;id=23B351AF-9416-40B3-9649-20D388A45E80",
  "https://www.cukashmir.ac.in/#/content;id=87AA0AD0-5E9E-4B1C-A200-7DEC9C77F76F",
  "https://www.cukashmir.ac.in/#/departlist;id=87AA0AD0-5E9E-4B1C-A200-7DEC9C77F76F",
  "https://www.cukashmir.ac.in/#/administration;id=87AA0AD0-5E9E-4B1C-A200-7DEC9C77F76F",
  "https://www.cukashmir.ac.in/#/content;id=59A745C8-5B20-4256-9F87-B163A41B7599",
  "https://www.cukashmir.ac.in/#/departlist;id=59A745C8-5B20-4256-9F87-B163A41B7599",
  "https://www.cukashmir.ac.in/#/administration;id=59A745C8-5B20-4256-9F87-B163A41B7599",
  "https://www.cukashmir.ac.in/#/content;id=F86B65AD-6C00-4041-971B-7F58FE72F6DA",
  "https://www.cukashmir.ac.in/#/departlist;id=F86B65AD-6C00-4041-971B-7F58FE72F6DA",
  "https://www.cukashmir.ac.in/#/administration;id=F86B65AD-6C00-4041-971B-7F58FE72F6DA",
  "https://www.cukashmir.ac.in/#/content;id=49FC1965-9C92-441B-B5FF-65E09161F0C2",
  "https://www.cukashmir.ac.in/#/departlist;id=49FC1965-9C92-441B-B5FF-65E09161F0C2",
  "https://www.cukashmir.ac.in/#/administration;id=49FC1965-9C92-441B-B5FF-65E09161F0C2",
  "https://www.cukashmir.ac.in/#/content;id=AE29AC82-A217-4C7C-BC89-8B8C36567670",
  "https://www.cukashmir.ac.in/#/departlist;id=AE29AC82-A217-4C7C-BC89-8B8C36567670",
  "https://www.cukashmir.ac.in/#/administration;id=AE29AC82-A217-4C7C-BC89-8B8C36567670",
  "https://www.cukashmir.ac.in/#/content;id=73F4E8D4-DDB9-4BCA-B3F1-BDC199F9A822",
  "https://www.cukashmir.ac.in/#/departlist;id=73F4E8D4-DDB9-4BCA-B3F1-BDC199F9A822",
  "https://www.cukashmir.ac.in/#/administration;id=73F4E8D4-DDB9-4BCA-B3F1-BDC199F9A822",
  "https://www.cukashmir.ac.in/#/content;id=564DD170-EDD7-4489-B5BE-99F02BDB3A54",
  "https://www.cukashmir.ac.in/#/departlist;id=564DD170-EDD7-4489-B5BE-99F02BDB3A54",
  "https://www.cukashmir.ac.in/#/administration;id=564DD170-EDD7-4489-B5BE-99F02BDB3A54",
  "https://www.cukashmir.ac.in/#/content;id=CD6DEA8A-E0B0-4D39-BB6E-49DB34335B25",
  "https://www.cukashmir.ac.in/#/departlist;id=CD6DEA8A-E0B0-4D39-BB6E-49DB34335B25",
  "https://www.cukashmir.ac.in/#/administration;id=CD6DEA8A-E0B0-4D39-BB6E-49DB34335B25",
  "https://www.cukashmir.ac.in/#/content;id=87DC275C-EF21-40DC-834A-DD15A2875366",
  "https://www.cukashmir.ac.in/#/departlist;id=87DC275C-EF21-40DC-834A-DD15A2875366",
  "https://www.cukashmir.ac.in/#/administration;id=87DC275C-EF21-40DC-834A-DD15A2875366",
  "https://www.cukashmir.ac.in/#/content;id=8C8E4389-6617-4978-964F-90EBEF94E708",
  "https://www.cukashmir.ac.in/#/departlist;id=8C8E4389-6617-4978-964F-90EBEF94E708",
  "https://www.cukashmir.ac.in/#/administration;id=8C8E4389-6617-4978-964F-90EBEF94E708",
  "https://www.cukashmir.ac.in/#/content;id=5BFD7533-32E9-4AA9-A703-DEBC5CFD930E",
  "https://www.cukashmir.ac.in/#/departlist;id=5BFD7533-32E9-4AA9-A703-DEBC5CFD930E",
  "https://www.cukashmir.ac.in/#/administration;id=5BFD7533-32E9-4AA9-A703-DEBC5CFD930E",
  "https://www.cukashmir.ac.in/#/content;id=17B2AFB7-BF83-4FAF-8159-EEE83D2A5ADB",
  "https://www.cukashmir.ac.in/#/departlist;id=17B2AFB7-BF83-4FAF-8159-EEE83D2A5ADB",
  "https://www.cukashmir.ac.in/#/administration;id=17B2AFB7-BF83-4FAF-8159-EEE83D2A5ADB",
  "https://www.cukashmir.ac.in/#/content;id=93C2B53F-CE57-4B6D-A37B-F09B8C797606",
  "https://www.cukashmir.ac.in/#/departlist;id=93C2B53F-CE57-4B6D-A37B-F09B8C797606",
  "https://www.cukashmir.ac.in/#/administration;id=93C2B53F-CE57-4B6D-A37B-F09B8C797606",
  "https://www.cukashmir.ac.in/#/content;id=194CC3A0-8A09-4BC0-BB99-1A840E55BDF5",
  "https://www.cukashmir.ac.in/#/departlist;id=194CC3A0-8A09-4BC0-BB99-1A840E55BDF5",
  "https://www.cukashmir.ac.in/#/administration;id=194CC3A0-8A09-4BC0-BB99-1A840E55BDF5",
  "https://www.cukashmir.ac.in/#/content;id=FD6CC38D-926A-412D-B866-11A4CCA7D1F9",
  "https://www.cukashmir.ac.in/#/departlist;id=FD6CC38D-926A-412D-B866-11A4CCA7D1F9",
  "https://www.cukashmir.ac.in/#/administration;id=FD6CC38D-926A-412D-B866-11A4CCA7D1F9",
  "https://www.cukashmir.ac.in/#/content;id=D62269D9-104D-43CF-A5F8-A09447B1227D",
  "https://www.cukashmir.ac.in/#/departlist;id=D62269D9-104D-43CF-A5F8-A09447B1227D",
  "https://www.cukashmir.ac.in/#/administration;id=D62269D9-104D-43CF-A5F8-A09447B1227D",
  "https://www.cukashmir.ac.in/#/content;id=E58354AA-54EC-40D2-A918-756665CC9455",
  "https://www.cukashmir.ac.in/#/departlist;id=E58354AA-54EC-40D2-A918-756665CC9455",
  "https://www.cukashmir.ac.in/#/administration;id=E58354AA-54EC-40D2-A918-756665CC9455",
  "https://www.cukashmir.ac.in/#/content;id=BB33F80D-A1B4-4709-BBB8-56064583FB98",
  "https://www.cukashmir.ac.in/#/departlist;id=BB33F80D-A1B4-4709-BBB8-56064583FB98",
  "https://www.cukashmir.ac.in/#/administration;id=BB33F80D-A1B4-4709-BBB8-56064583FB98",
  "https://www.cukashmir.ac.in/#/content;id=03222A36-C0E4-4041-BE31-A75F4BFDDBB5",
  "https://www.cukashmir.ac.in/#/departlist;id=03222A36-C0E4-4041-BE31-A75F4BFDDBB5",
  "https://www.cukashmir.ac.in/#/administration;id=03222A36-C0E4-4041-BE31-A75F4BFDDBB5",
  "https://www.cukashmir.ac.in/#/content;id=62B63358-FF4F-4D01-9D1B-204C49810B2D",
  "https://www.cukashmir.ac.in/#/departlist;id=62B63358-FF4F-4D01-9D1B-204C49810B2D",
  "https://www.cukashmir.ac.in/#/administration;id=62B63358-FF4F-4D01-9D1B-204C49810B2D",
  "https://www.cukashmir.ac.in/#/content;id=98FD7992-147D-4CA6-9916-3E71273CE821",
  "https://www.cukashmir.ac.in/#/departlist;id=98FD7992-147D-4CA6-9916-3E71273CE821",
  "https://www.cukashmir.ac.in/#/administration;id=98FD7992-147D-4CA6-9916-3E71273CE821",
  "https://www.cukashmir.ac.in/#/content;id=934BAC32-CEE8-467F-B5DA-BE13B7AA4DAC",
  "https://www.cukashmir.ac.in/#/departlist;id=934BAC32-CEE8-467F-B5DA-BE13B7AA4DAC",
  "https://www.cukashmir.ac.in/#/administration;id=934BAC32-CEE8-467F-B5DA-BE13B7AA4DAC",
  "https://www.cukashmir.ac.in/#/content;id=69974459-04CD-4039-91D4-48F5BFCEDBBE",
  "https://www.cukashmir.ac.in/#/departlist;id=69974459-04CD-4039-91D4-48F5BFCEDBBE",
  "https://www.cukashmir.ac.in/#/administration;id=69974459-04CD-4039-91D4-48F5BFCEDBBE",
  "https://www.cukashmir.ac.in/#/content;id=5E7D3E4E-E0E9-4C2D-97D3-9E890754C4A5",
  "https://www.cukashmir.ac.in/#/departlist;id=5E7D3E4E-E0E9-4C2D-97D3-9E890754C4A5",
  "https://www.cukashmir.ac.in/#/administration;id=5E7D3E4E-E0E9-4C2D-97D3-9E890754C4A5",
  "https://www.cukashmir.ac.in/#/content;id=77032E17-AD03-464B-83F9-91EDDEDC40D6",
  "https://www.cukashmir.ac.in/#/departlist;id=77032E17-AD03-464B-83F9-91EDDEDC40D6",
  "https://www.cukashmir.ac.in/#/administration;id=77032E17-AD03-464B-83F9-91EDDEDC40D6",
  "https://www.cukashmir.ac.in/#/content;id=C23DFF76-BE9D-4E15-96BF-2AA026CA0D72",
  "https://www.cukashmir.ac.in/#/departlist;id=C23DFF76-BE9D-4E15-96BF-2AA026CA0D72",
  "https://www.cukashmir.ac.in/#/administration;id=C23DFF76-BE9D-4E15-96BF-2AA026CA0D72",
  "https://www.cukashmir.ac.in/#/content;id=858F8099-4E65-40D9-B2E4-17C4C3EB86CF",
  "https://www.cukashmir.ac.in/#/departlist;id=858F8099-4E65-40D9-B2E4-17C4C3EB86CF",
  "https://www.cukashmir.ac.in/#/administration;id=858F8099-4E65-40D9-B2E4-17C4C3EB86CF",
  "https://www.cukashmir.ac.in/#/content;id=53E45A25-3B31-4617-8E80-FA3F0C2DA40E",
  "https://www.cukashmir.ac.in/#/departlist;id=53E45A25-3B31-4617-8E80-FA3F0C2DA40E",
  "https://www.cukashmir.ac.in/#/administration;id=53E45A25-3B31-4617-8E80-FA3F0C2DA40E",
  "https://www.cukashmir.ac.in/#/content;id=F55D6A7D-580F-4785-81E0-DDF22BC6417D",
  "https://www.cukashmir.ac.in/#/departlist;id=F55D6A7D-580F-4785-81E0-DDF22BC6417D",
  "https://www.cukashmir.ac.in/#/administration;id=F55D6A7D-580F-4785-81E0-DDF22BC6417D",
  "https://www.cukashmir.ac.in/#/content;id=D9477E0E-16DB-40C4-B62A-AE3FEC83C3C3",
  "https://www.cukashmir.ac.in/#/departlist;id=D9477E0E-16DB-40C4-B62A-AE3FEC83C3C3",
  "https://www.cukashmir.ac.in/#/administration;id=D9477E0E-16DB-40C4-B62A-AE3FEC83C3C3",
  "https://www.cukashmir.ac.in/#/content;id=3301D95F-D343-4A62-BCA1-DEA6EE77B31C",
  "https://www.cukashmir.ac.in/#/departlist;id=3301D95F-D343-4A62-BCA1-DEA6EE77B31C",
  "https://www.cukashmir.ac.in/#/administration;id=3301D95F-D343-4A62-BCA1-DEA6EE77B31C",
  "https://www.cukashmir.ac.in/#/content;id=D8C93947-46F3-495A-9386-2F2008DFDC85",
  "https://www.cukashmir.ac.in/#/departlist;id=D8C93947-46F3-495A-9386-2F2008DFDC85",
  "https://www.cukashmir.ac.in/#/administration;id=D8C93947-46F3-495A-9386-2F2008DFDC85",
  "https://www.cukashmir.ac.in/#/content;id=519CC894-8129-4255-85C7-CCCD538CF5F2",
  "https://www.cukashmir.ac.in/#/departlist;id=519CC894-8129-4255-85C7-CCCD538CF5F2",
  "https://www.cukashmir.ac.in/#/administration;id=519CC894-8129-4255-85C7-CCCD538CF5F2",
  "https://www.cukashmir.ac.in/#/content;id=56D808A9-EBF3-4ECB-8792-94052C6969D4",
  "https://www.cukashmir.ac.in/#/departlist;id=56D808A9-EBF3-4ECB-8792-94052C6969D4",
  "https://www.cukashmir.ac.in/#/administration;id=56D808A9-EBF3-4ECB-8792-94052C6969D4",
  "https://www.cukashmir.ac.in/#/content;id=F734AD9B-A571-4363-A9F1-021CEF54C3B8",
  "https://www.cukashmir.ac.in/#/departlist;id=F734AD9B-A571-4363-A9F1-021CEF54C3B8",
  "https://www.cukashmir.ac.in/#/administration;id=F734AD9B-A571-4363-A9F1-021CEF54C3B8",
  "https://www.cukashmir.ac.in/#/content;id=951DFE59-E1DF-4C6D-B0D3-C6DB1D65A844",
  "https://www.cukashmir.ac.in/#/departlist;id=951DFE59-E1DF-4C6D-B0D3-C6DB1D65A844",
  "https://www.cukashmir.ac.in/#/administration;id=951DFE59-E1DF-4C6D-B0D3-C6DB1D65A844",
  "https://www.cukashmir.ac.in/#/content;id=7AD15CC6-7118-4931-B485-B08EEE9AE153",
  "https://www.cukashmir.ac.in/#/departlist;id=7AD15CC6-7118-4931-B485-B08EEE9AE153",
  "https://www.cukashmir.ac.in/#/administration;id=7AD15CC6-7118-4931-B485-B08EEE9AE153",
  "https://www.cukashmir.ac.in/#/content;id=DAB48431-E4F3-4FC4-8B87-A8A5620B9629",
  "https://www.cukashmir.ac.in/#/departlist;id=DAB48431-E4F3-4FC4-8B87-A8A5620B9629",
  "https://www.cukashmir.ac.in/#/administration;id=DAB48431-E4F3-4FC4-8B87-A8A5620B9629",
  "https://www.cukashmir.ac.in/#/content;id=DBE95A7F-D1CE-4931-97D2-78C7A79BAFD9",
  "https://www.cukashmir.ac.in/#/departlist;id=DBE95A7F-D1CE-4931-97D2-78C7A79BAFD9",
  "https://www.cukashmir.ac.in/#/administration;id=DBE95A7F-D1CE-4931-97D2-78C7A79BAFD9",
  "https://www.cukashmir.ac.in/#/content;id=8DE324D1-3B87-4227-A0DC-6FBE82994CF0",
  "https://www.cukashmir.ac.in/#/departlist;id=8DE324D1-3B87-4227-A0DC-6FBE82994CF0",
  "https://www.cukashmir.ac.in/#/administration;id=8DE324D1-3B87-4227-A0DC-6FBE82994CF0",
  "https://www.cukashmir.ac.in/#/content;id=690782D3-4C67-44A0-8B19-AD1542734F8E",
  "https://www.cukashmir.ac.in/#/departlist;id=690782D3-4C67-44A0-8B19-AD1542734F8E",
  "https://www.cukashmir.ac.in/#/administration;id=690782D3-4C67-44A0-8B19-AD1542734F8E",
  "https://www.cukashmir.ac.in/#/content;id=34BF8F99-FCC3-4C13-B7D1-4A7A4289DEB8",
  "https://www.cukashmir.ac.in/#/departlist;id=34BF8F99-FCC3-4C13-B7D1-4A7A4289DEB8",
  "https://www.cukashmir.ac.in/#/administration;id=34BF8F99-FCC3-4C13-B7D1-4A7A4289DEB8",
  "https://www.cukashmir.ac.in/#/content;id=66DAFABE-7543-43C1-8C02-F5AD0390D1EE",
  "https://www.cukashmir.ac.in/#/departlist;id=66DAFABE-7543-43C1-8C02-F5AD0390D1EE",
  "https://www.cukashmir.ac.in/#/administration;id=66DAFABE-7543-43C1-8C02-F5AD0390D1EE",
  "https://www.cukashmir.ac.in/#/content;id=7B663AC4-1734-4B39-9DAC-EBF5DCBC0411",
  "https://www.cukashmir.ac.in/#/departlist;id=7B663AC4-1734-4B39-9DAC-EBF5DCBC0411",
  "https://www.cukashmir.ac.in/#/administration;id=7B663AC4-1734-4B39-9DAC-EBF5DCBC0411",
  "https://www.cukashmir.ac.in/#/content;id=8EB85D79-F0EE-49E7-BCC4-923633837839",
  "https://www.cukashmir.ac.in/#/departlist;id=8EB85D79-F0EE-49E7-BCC4-923633837839",
  "https://www.cukashmir.ac.in/#/administration;id=8EB85D79-F0EE-49E7-BCC4-923633837839",
  "https://www.cukashmir.ac.in/#/content;id=4075F260-0933-4021-8CD6-ECC37C3C6ABC",
  "https://www.cukashmir.ac.in/#/departlist;id=4075F260-0933-4021-8CD6-ECC37C3C6ABC",
  "https://www.cukashmir.ac.in/#/administration;id=4075F260-0933-4021-8CD6-ECC37C3C6ABC",
  "https://www.cukashmir.ac.in/#/content;id=DA2C483C-95FA-4482-BA64-DE700067C7B6",
  "https://www.cukashmir.ac.in/#/departlist;id=DA2C483C-95FA-4482-BA64-DE700067C7B6",
  "https://www.cukashmir.ac.in/#/administration;id=DA2C483C-95FA-4482-BA64-DE700067C7B6",
  "https://www.cukashmir.ac.in/#/content;id=5336375A-458B-4734-839A-68E1B4EED843",
  "https://www.cukashmir.ac.in/#/departlist;id=5336375A-458B-4734-839A-68E1B4EED843",
  "https://www.cukashmir.ac.in/#/administration;id=5336375A-458B-4734-839A-68E1B4EED843",
  "https://www.cukashmir.ac.in/#/content;id=96C12D6C-660B-456A-B8B1-3FFF352A880F",
  "https://www.cukashmir.ac.in/#/departlist;id=96C12D6C-660B-456A-B8B1-3FFF352A880F",
  "https://www.cukashmir.ac.in/#/administration;id=96C12D6C-660B-456A-B8B1-3FFF352A880F",
  "https://www.cukashmir.ac.in/#/content;id=8F0D5940-5962-48B3-A95B-70B879277370",
  "https://www.cukashmir.ac.in/#/departlist;id=8F0D5940-5962-48B3-A95B-70B879277370",
  "https://www.cukashmir.ac.in/#/administration;id=8F0D5940-5962-48B3-A95B-70B879277370",
  "https://www.cukashmir.ac.in/#/content;id=8C46FDD2-F0F4-412D-BAD9-C37DB3EBAFA3",
  "https://www.cukashmir.ac.in/#/departlist;id=8C46FDD2-F0F4-412D-BAD9-C37DB3EBAFA3",
  "https://www.cukashmir.ac.in/#/administration;id=8C46FDD2-F0F4-412D-BAD9-C37DB3EBAFA3",
  "https://www.cukashmir.ac.in/#/content;id=59138E2F-AFDD-4F9A-A804-AD185B02373B",
  "https://www.cukashmir.ac.in/#/departlist;id=59138E2F-AFDD-4F9A-A804-AD185B02373B",
  "https://www.cukashmir.ac.in/#/administration;id=59138E2F-AFDD-4F9A-A804-AD185B02373B",
  "https://www.cukashmir.ac.in/#/content;id=95275299-E3E2-424D-8B0E-9E769B62DFE2",
  "https://www.cukashmir.ac.in/#/departlist;id=95275299-E3E2-424D-8B0E-9E769B62DFE2",
  "https://www.cukashmir.ac.in/#/administration;id=95275299-E3E2-424D-8B0E-9E769B62DFE2",
  "https://www.cukashmir.ac.in/#/content;id=3AC4B156-A6C7-4C60-9B9B-C6751A242347",
  "https://www.cukashmir.ac.in/#/departlist;id=3AC4B156-A6C7-4C60-9B9B-C6751A242347",
  "https://www.cukashmir.ac.in/#/administration;id=3AC4B156-A6C7-4C60-9B9B-C6751A242347",
  "https://www.cukashmir.ac.in/#/content;id=BB9F78A3-8B60-4CA2-9F4A-90186E31562C",
  "https://www.cukashmir.ac.in/#/departlist;id=BB9F78A3-8B60-4CA2-9F4A-90186E31562C",
  "https://www.cukashmir.ac.in/#/administration;id=BB9F78A3-8B60-4CA2-9F4A-90186E31562C",
  "https://www.cukashmir.ac.in/#/content;id=F08AB290-D335-42DC-B63E-45D739D16881",
  "https://www.cukashmir.ac.in/#/departlist;id=F08AB290-D335-42DC-B63E-45D739D16881",
  "https://www.cukashmir.ac.in/#/administration;id=F08AB290-D335-42DC-B63E-45D739D16881",
  "https://www.cukashmir.ac.in/#/content;id=DDAD4E07-ECD5-4C67-A6FC-4B4DB48D0521",
  "https://www.cukashmir.ac.in/#/departlist;id=DDAD4E07-ECD5-4C67-A6FC-4B4DB48D0521",
  "https://www.cukashmir.ac.in/#/administration;id=DDAD4E07-ECD5-4C67-A6FC-4B4DB48D0521",
  "https://www.cukashmir.ac.in/#/content;id=ACED671E-26F3-49BA-A365-A61C540D645F",
  "https://www.cukashmir.ac.in/#/departlist;id=ACED671E-26F3-49BA-A365-A61C540D645F",
  "https://www.cukashmir.ac.in/#/administration;id=ACED671E-26F3-49BA-A365-A61C540D645F",
  "https://www.cukashmir.ac.in/#/content;id=51C71663-4297-4866-AC49-22D2DDD4D4DC",
  "https://www.cukashmir.ac.in/#/departlist;id=51C71663-4297-4866-AC49-22D2DDD4D4DC",
  "https://www.cukashmir.ac.in/#/administration;id=51C71663-4297-4866-AC49-22D2DDD4D4DC",
  "https://www.cukashmir.ac.in/#/content;id=7041666D-C9D5-4092-94C2-C7BB7C0F0FB8",
  "https://www.cukashmir.ac.in/#/departlist;id=7041666D-C9D5-4092-94C2-C7BB7C0F0FB8",
  "https://www.cukashmir.ac.in/#/administration;id=7041666D-C9D5-4092-94C2-C7BB7C0F0FB8",
  "https://www.cukashmir.ac.in/#/home",
  "https://www.cukashmir.ac.in/#/screenreaderaccess",
  "https://www.cukashmir.ac.in/#/administrative-list;id=51B4389C-5A10-4706-82AE-112C4AFD76EC",
  "https://www.cukashmir.ac.in/#/administration",
  "https://www.cukashmir.ac.in/#/school",
  "https://www.cukashmir.ac.in/#/administrative-list;id=903E24E0-3B48-4B0B-B6E7-A6E7FBEAC9CA",
  "https://www.cukashmir.ac.in/#/administration;id=AE8755A4-B002-49A7-804D-0143FA8B0DD8;menuid=D67E96EC-D44E-42C1-AE6A-CE78C2D292C3",
  "https://www.cukashmir.ac.in/#/content?type=Press%20Release&id=4934A99B-160F-471D-A24F-FB557B6DC0B9",
  "https://www.cukashmir.ac.in/#/content?type=Press%20Release&id=0B3C1E4C-990D-4B37-82DE-593DB3FB74BE",
  "https://www.cukashmir.ac.in/#/content?type=Press%20Release&id=E7DA1062-893A-4F5F-807A-81D49D920EC9",
  "https://www.cukashmir.ac.in/6th%20Provisional%20Selection%20List%20for%2002%20MSc%20Zoology%20(Lateral%20Entry)%202026",
  "https://www.cukashmir.ac.in/Provisional%20Selection%20List%20No.%202%20of%202026%20for%20Integrated%20B.%20Ed-%20M.%20Ed%20Programme-2026",
  "https://www.cukashmir.ac.in/#/message?type=Message",
  "https://www.cukashmir.ac.in/#/event-gallery;type=Photo",
  "https://www.cukashmir.ac.in/#/notifications?type=CUK%20In%20Media",
  "https://www.cukashmir.ac.in/#/content?type=Additional%20Card&id=62B63358-FF4F-4D01-9D1B-204C49810B2D",
  "https://www.cukashmir.ac.in/#/content?type=Additional%20Card&id=858F8099-4E65-40D9-B2E4-17C4C3EB86CF",
  "https://www.cukashmir.ac.in/#/content?type=Additional%20Card&id=F55D6A7D-580F-4785-81E0-DDF22BC6417D",
  "https://www.cukashmir.ac.in/#/content?type=Additional%20Card&id=D8C93947-46F3-495A-9386-2F2008DFDC85",
  "https://www.cukashmir.ac.in/#/content?type=Additional%20Card&id=7041666D-C9D5-4092-94C2-C7BB7C0F0FB8",
  "https://www.cukashmir.ac.in/#/implink;id=1F52920E-78B9-4D3D-96FC-5AFB04308D2F",
  "https://www.publications.cukashmir.ac.in/index.php/CUKLR",
  "https://www.publications.cukashmir.ac.in/index.php/JRIE",
  "https://www.cukashmir.ac.in/#/content;id=85427974-A290-4601-9451-BFA59856BB19",
  "https://www.cukashmir.ac.in/#/departlist;id=85427974-A290-4601-9451-BFA59856BB19",
  "https://www.cukashmir.ac.in/#/administration;id=85427974-A290-4601-9451-BFA59856BB19",
  "https://www.cukashmir.ac.in/#/content;id=C194AB22-76BA-456D-A96A-316988690AA4",
  "https://www.cukashmir.ac.in/#/departlist;id=C194AB22-76BA-456D-A96A-316988690AA4",
  "https://www.cukashmir.ac.in/#/administration;id=C194AB22-76BA-456D-A96A-316988690AA4",
  "https://www.cukashmir.ac.in/#/content;id=6D433582-F9C1-48E5-BF09-02B4603B4A0D",
  "https://www.cukashmir.ac.in/#/departlist;id=6D433582-F9C1-48E5-BF09-02B4603B4A0D",
  "https://www.cukashmir.ac.in/#/administration;id=6D433582-F9C1-48E5-BF09-02B4603B4A0D",
  "https://www.cukashmir.ac.in/#/content;id=9B23B457-131D-4790-8D01-E1089B3CF5C2",
  "https://www.cukashmir.ac.in/#/departlist;id=9B23B457-131D-4790-8D01-E1089B3CF5C2",
  "https://www.cukashmir.ac.in/#/administration;id=9B23B457-131D-4790-8D01-E1089B3CF5C2",
  "https://www.cukashmir.ac.in/#/content;id=1CAE61F1-4A53-411C-9806-76F23EC9981B",
  "https://www.cukashmir.ac.in/#/departlist;id=1CAE61F1-4A53-411C-9806-76F23EC9981B",
  "https://www.cukashmir.ac.in/#/administration;id=1CAE61F1-4A53-411C-9806-76F23EC9981B",
  "https://www.cukashmir.ac.in/#/content;id=247A542E-F392-4084-BCF6-C0284A91D677",
  "https://www.cukashmir.ac.in/#/departlist;id=247A542E-F392-4084-BCF6-C0284A91D677",
  "https://www.cukashmir.ac.in/#/administration;id=247A542E-F392-4084-BCF6-C0284A91D677",
  "https://www.cukashmir.ac.in/#/content;id=ADF536C6-428B-45E1-82A5-7A3AD1EF2C4D",
  "https://www.cukashmir.ac.in/#/departlist;id=ADF536C6-428B-45E1-82A5-7A3AD1EF2C4D",
  "https://www.cukashmir.ac.in/#/administration;id=ADF536C6-428B-45E1-82A5-7A3AD1EF2C4D",
  "https://www.cukashmir.ac.in/#/content;id=330588D8-4EC8-4F8C-9248-4FBD803EE55C",
  "https://www.cukashmir.ac.in/#/departlist;id=330588D8-4EC8-4F8C-9248-4FBD803EE55C",
  "https://www.cukashmir.ac.in/#/administration;id=330588D8-4EC8-4F8C-9248-4FBD803EE55C",
  "https://www.cukashmir.ac.in/#/content;id=44513A0D-EC11-4B68-A330-9A18E40E24FB",
  "https://www.cukashmir.ac.in/#/departlist;id=44513A0D-EC11-4B68-A330-9A18E40E24FB",
  "https://www.cukashmir.ac.in/#/administration;id=44513A0D-EC11-4B68-A330-9A18E40E24FB",
  "https://www.cukashmir.ac.in/#/content;id=D590A24A-3813-450B-B38E-CE4D2529BF2D",
  "https://www.cukashmir.ac.in/#/departlist;id=D590A24A-3813-450B-B38E-CE4D2529BF2D",
  "https://www.cukashmir.ac.in/#/administration;id=D590A24A-3813-450B-B38E-CE4D2529BF2D",
  "https://www.cukashmir.ac.in/#/content;id=29285960-113D-4B04-AF60-9ADB621E5ADC",
  "https://www.cukashmir.ac.in/#/departlist;id=29285960-113D-4B04-AF60-9ADB621E5ADC",
  "https://www.cukashmir.ac.in/#/administration;id=29285960-113D-4B04-AF60-9ADB621E5ADC",
  "https://www.cukashmir.ac.in/#/content;id=F4CE6B6B-39F0-486D-BC9A-3EEC66B8C6B3",
  "https://www.cukashmir.ac.in/#/departlist;id=F4CE6B6B-39F0-486D-BC9A-3EEC66B8C6B3",
  "https://www.cukashmir.ac.in/#/administration;id=F4CE6B6B-39F0-486D-BC9A-3EEC66B8C6B3",
  "https://www.cukashmir.ac.in/#/content;id=3D4847D5-E26F-4EA8-8ABA-C8B2D0D567D8",
  "https://www.cukashmir.ac.in/#/departlist;id=3D4847D5-E26F-4EA8-8ABA-C8B2D0D567D8",
  "https://www.cukashmir.ac.in/#/administration;id=3D4847D5-E26F-4EA8-8ABA-C8B2D0D567D8",
  "https://www.cukashmir.ac.in/#/content;id=266AFE48-86D3-4439-9123-9C525298F5C1",
  "https://www.cukashmir.ac.in/#/departlist;id=266AFE48-86D3-4439-9123-9C525298F5C1",
  "https://www.cukashmir.ac.in/#/administration;id=266AFE48-86D3-4439-9123-9C525298F5C1",
  "https://www.cukashmir.ac.in/#/content;id=AF5ED81C-FF8B-452C-BB40-D7BA4EB64F51",
  "https://www.cukashmir.ac.in/#/departlist;id=AF5ED81C-FF8B-452C-BB40-D7BA4EB64F51",
  "https://www.cukashmir.ac.in/#/administration;id=AF5ED81C-FF8B-452C-BB40-D7BA4EB64F51",
  "https://www.cukashmir.ac.in/#/content;id=25DAF05C-C5B3-484A-A8EA-52857410CD5F",
  "https://www.cukashmir.ac.in/#/departlist;id=25DAF05C-C5B3-484A-A8EA-52857410CD5F",
  "https://www.cukashmir.ac.in/#/administration;id=25DAF05C-C5B3-484A-A8EA-52857410CD5F",
  "https://www.cukashmir.ac.in/#/content;id=C63B5166-0853-4741-A6FD-DE6651C2012A",
  "https://www.cukashmir.ac.in/#/departlist;id=C63B5166-0853-4741-A6FD-DE6651C2012A",
  "https://www.cukashmir.ac.in/#/administration;id=C63B5166-0853-4741-A6FD-DE6651C2012A",
  "https://www.cukashmir.ac.in/#/content;id=8CB81292-1DD0-47F5-8E83-2B9F8EA3CF21",
  "https://www.cukashmir.ac.in/#/departlist;id=8CB81292-1DD0-47F5-8E83-2B9F8EA3CF21",
  "https://www.cukashmir.ac.in/#/administration;id=8CB81292-1DD0-47F5-8E83-2B9F8EA3CF21",
  "https://www.cukashmir.ac.in/#/content;id=AAE2AA55-E76F-4717-8210-FEEF953FE09A",
  "https://www.cukashmir.ac.in/#/departlist;id=AAE2AA55-E76F-4717-8210-FEEF953FE09A",
  "https://www.cukashmir.ac.in/#/administration;id=AAE2AA55-E76F-4717-8210-FEEF953FE09A",
  "https://www.cukashmir.ac.in/#/content;id=EA953264-0850-4DD3-9E5F-D9A579D6FC6D",
  "https://www.cukashmir.ac.in/#/departlist;id=EA953264-0850-4DD3-9E5F-D9A579D6FC6D",
  "https://www.cukashmir.ac.in/#/administration;id=EA953264-0850-4DD3-9E5F-D9A579D6FC6D",
  "https://www.cukashmir.ac.in/#/content;id=2FF105F5-0F0D-4BE3-8E0C-2CDBB01F37B9",
  "https://www.cukashmir.ac.in/#/departlist;id=2FF105F5-0F0D-4BE3-8E0C-2CDBB01F37B9",
  "https://www.cukashmir.ac.in/#/administration;id=2FF105F5-0F0D-4BE3-8E0C-2CDBB01F37B9",
  "https://www.cukashmir.ac.in/#/content;id=00C8BFA1-31F7-4773-8551-E5ACF38180A6",
  "https://www.cukashmir.ac.in/#/departlist;id=00C8BFA1-31F7-4773-8551-E5ACF38180A6",
  "https://www.cukashmir.ac.in/#/administration;id=00C8BFA1-31F7-4773-8551-E5ACF38180A6",
  "https://www.cukashmir.ac.in/#/content;id=D617A218-4E7F-4E82-8F01-F639FFB6C0E5",
  "https://www.cukashmir.ac.in/#/departlist;id=D617A218-4E7F-4E82-8F01-F639FFB6C0E5",
  "https://www.cukashmir.ac.in/#/administration;id=D617A218-4E7F-4E82-8F01-F639FFB6C0E5",
  "https://www.cukashmir.ac.in/#/content;id=6FD4816B-E709-4FC7-811A-5B383361C524",
  "https://www.cukashmir.ac.in/#/departlist;id=6FD4816B-E709-4FC7-811A-5B383361C524",
  "https://www.cukashmir.ac.in/#/administration;id=6FD4816B-E709-4FC7-811A-5B383361C524",
  "https://www.cukashmir.ac.in/#/content;id=F8A3EC02-01C3-4EAD-87B7-EF8FF3C57C8C",
  "https://www.cukashmir.ac.in/#/departlist;id=F8A3EC02-01C3-4EAD-87B7-EF8FF3C57C8C",
  "https://www.cukashmir.ac.in/#/administration;id=F8A3EC02-01C3-4EAD-87B7-EF8FF3C57C8C",
  "https://www.cukashmir.ac.in/#/content;id=BE7D9C13-F196-4EE4-AE0B-C26AC8EDE759",
  "https://www.cukashmir.ac.in/#/departlist;id=BE7D9C13-F196-4EE4-AE0B-C26AC8EDE759",
  "https://www.cukashmir.ac.in/#/administration;id=BE7D9C13-F196-4EE4-AE0B-C26AC8EDE759",
  "https://www.cukashmir.ac.in/#/content;id=88F69E41-326E-4F28-92DA-94C0135D1DCD",
  "https://www.cukashmir.ac.in/#/departlist;id=88F69E41-326E-4F28-92DA-94C0135D1DCD",
  "https://www.cukashmir.ac.in/#/administration;id=88F69E41-326E-4F28-92DA-94C0135D1DCD",
  "https://www.cukashmir.ac.in/#/content;id=C223F25F-098A-40DB-95FB-623477DD4F24",
  "https://www.cukashmir.ac.in/#/departlist;id=C223F25F-098A-40DB-95FB-623477DD4F24",
  "https://www.cukashmir.ac.in/#/administration;id=C223F25F-098A-40DB-95FB-623477DD4F24",
  "https://www.cukashmir.ac.in/#/content;id=CE5F5ACC-0E68-4FDA-B8FF-6DA54D8F3B96",
  "https://www.cukashmir.ac.in/#/departlist;id=CE5F5ACC-0E68-4FDA-B8FF-6DA54D8F3B96",
  "https://www.cukashmir.ac.in/#/administration;id=CE5F5ACC-0E68-4FDA-B8FF-6DA54D8F3B96",
  "https://www.cukashmir.ac.in/#/content;id=2B6FCBF0-6D29-42AA-9AD0-F5129CAA7C22",
  "https://www.cukashmir.ac.in/#/departlist;id=2B6FCBF0-6D29-42AA-9AD0-F5129CAA7C22",
  "https://www.cukashmir.ac.in/#/administration;id=2B6FCBF0-6D29-42AA-9AD0-F5129CAA7C22",
  "https://www.cukashmir.ac.in/#/content;id=E0B0CDAD-E77C-4FD8-9911-FB886EFDDA56",
  "https://www.cukashmir.ac.in/#/departlist;id=E0B0CDAD-E77C-4FD8-9911-FB886EFDDA56",
  "https://www.cukashmir.ac.in/#/administration;id=E0B0CDAD-E77C-4FD8-9911-FB886EFDDA56",
  "https://www.cukashmir.ac.in/#/content;id=3B70E713-9B90-482E-A339-BB8684434069",
  "https://www.cukashmir.ac.in/#/departlist;id=3B70E713-9B90-482E-A339-BB8684434069",
  "https://www.cukashmir.ac.in/#/administration;id=3B70E713-9B90-482E-A339-BB8684434069",
  "https://www.cukashmir.ac.in/#/content;id=A464DE0A-748C-4036-A1F6-BF267AA9BBEA",
  "https://www.cukashmir.ac.in/#/departlist;id=A464DE0A-748C-4036-A1F6-BF267AA9BBEA",
  "https://www.cukashmir.ac.in/#/administration;id=A464DE0A-748C-4036-A1F6-BF267AA9BBEA",
  "https://www.cukashmir.ac.in/#/content;id=9C8BD9E4-FE88-4B15-B82A-85EB88515054",
  "https://www.cukashmir.ac.in/#/departlist;id=9C8BD9E4-FE88-4B15-B82A-85EB88515054",
  "https://www.cukashmir.ac.in/#/administration;id=9C8BD9E4-FE88-4B15-B82A-85EB88515054",
  "https://www.cukashmir.ac.in/#/content;id=057B900A-AD1E-453F-B376-C7A159F58250",
  "https://www.cukashmir.ac.in/#/departlist;id=057B900A-AD1E-453F-B376-C7A159F58250",
  "https://www.cukashmir.ac.in/#/administration;id=057B900A-AD1E-453F-B376-C7A159F58250",
  "https://www.cukashmir.ac.in/#/content;id=187D6F7B-41BB-407F-80CC-0858B32F249D",
  "https://www.cukashmir.ac.in/#/departlist;id=187D6F7B-41BB-407F-80CC-0858B32F249D",
  "https://www.cukashmir.ac.in/#/administration;id=187D6F7B-41BB-407F-80CC-0858B32F249D",
  "https://www.cukashmir.ac.in/#/content?type=Quick%20Link&id=D590A24A-3813-450B-B38E-CE4D2529BF2D",
  "https://www.cukashmir.ac.in/#/content?type=Message&id=1657497A-728D-4754-BE0D-87F8F768BFAE",
  "https://www.cukashmir.ac.in/#/content?type=Press%20Release&id=2FF105F5-0F0D-4BE3-8E0C-2CDBB01F37B9",
  "https://www.cukashmir.ac.in/#/content?type=Press%20Release&id=00C8BFA1-31F7-4773-8551-E5ACF38180A6",
  "https://www.cukashmir.ac.in/#/content?type=Press%20Release&id=D617A218-4E7F-4E82-8F01-F639FFB6C0E5",
  "https://www.cukashmir.ac.in/#/content?type=Press%20Release&id=6FD4816B-E709-4FC7-811A-5B383361C524",
  "https://www.cukashmir.ac.in/#/content?type=Press%20Release&id=F8A3EC02-01C3-4EAD-87B7-EF8FF3C57C8C",
  "https://www.cukashmir.ac.in/#/content?type=Press%20Release&id=BE7D9C13-F196-4EE4-AE0B-C26AC8EDE759",
  "https://www.cukashmir.ac.in/#/content?type=Press%20Release&id=88F69E41-326E-4F28-92DA-94C0135D1DCD",
  "https://www.cukashmir.ac.in/#/content?type=Press%20Release&id=C223F25F-098A-40DB-95FB-623477DD4F24",
  "https://www.cukashmir.ac.in/#/content?type=Press%20Release&id=CE5F5ACC-0E68-4FDA-B8FF-6DA54D8F3B96",
  "https://www.cukashmir.ac.in/#/implink;id=1F52920E-78B9-4D3D-96FC-5AFB04308D2F/home",
  "https://www.cukashmir.ac.in/docs/Docs-to-be-attached%20updated.pdf",
  "https://www.cukashmir.ac.in/docs/Character%20Format%2004-02-2021.pdf",
  "https://www.cukashmir.ac.in/docs/NOC%20Edited%2004-07-2022.pdf",
  "https://www.cukashmir.ac.in/docs/Official%20Email%20new.pdf",
  "https://www.cukashmir.ac.in/docs/Internet%20ID%20new.pdf",
  "https://www.cukashmir.ac.in/docs/NIRF2017-18.pdf",
  "https://www.cukashmir.ac.in/#/content;id=4EBF4FA2-472E-43B8-8A0C-891BB217AF95",
  "https://www.cukashmir.ac.in/#/departlist;id=4EBF4FA2-472E-43B8-8A0C-891BB217AF95",
  "https://www.cukashmir.ac.in/#/administration;id=4EBF4FA2-472E-43B8-8A0C-891BB217AF95",
  "https://www.cukashmir.ac.in/#/content;id=ADC78F7C-A156-4F70-97F8-E199107680E8",
  "https://www.cukashmir.ac.in/#/departlist;id=ADC78F7C-A156-4F70-97F8-E199107680E8",
  "https://www.cukashmir.ac.in/#/administration;id=ADC78F7C-A156-4F70-97F8-E199107680E8"
]
ALLOWED_HOSTS = {"www.cukashmir.ac.in", "cukashmir.ac.in", "www.ugc.gov.in", "ugc.gov.in"}
MAX_PAGES = len(SEED_URLS)

HTTP_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

DEFAULT_WORKERS = 15

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("scrape_cuk")

_BOGUS_EMAIL_SUFFIXES = (
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".svg",
    ".js",
    ".css",
    ".ico",
    ".pdf",
)

EMAIL_PATTERN = re.compile(
    r"\b[A-Za-z0-9](?:[A-Za-z0-9._%+-]*[A-Za-z0-9])?@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}\b"
)
# Indian mobiles, +91, optional separators; landline-style clusters (e.g. 0194-xxx-xxxx)
PHONE_PATTERNS = [
    re.compile(
        r"(?:\+91|0091)[\s.\-]?(?:\(?0?\d{2,4}\)?[\s.\-]?\d{3,4}[\s.\-]?\d{3,6}|[6-9]\d{9})"
    ),
    re.compile(r"(?<!\d)0\d{2,4}[\s.\-/]\d{3,4}[\s.\-/]\d{3,6}(?!\d)"),
    re.compile(r"(?<!\d)(?:\+91[\s.\-]*)?[6-9]\d{9}(?!\d)"),
]


def _plausible_email(addr: str) -> bool:
    addr = addr.lower().strip()
    if "@" not in addr:
        return False
    domain = addr.rsplit("@", 1)[-1]
    return not any(domain.endswith(sfx) for sfx in _BOGUS_EMAIL_SUFFIXES)


def _safe_name(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path.strip("/") or "home"
    fragment = parsed.fragment.strip()
    frag_part = f"_{fragment}" if fragment else ""
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", f"{parsed.netloc}_{path}{frag_part}")[:160].strip("_")
    return f"{slug}.txt"


def _extract_text(soup: BeautifulSoup) -> str:
    """Extract clean, properly formatted text from HTML with proper spacing and structure."""
    # Remove unwanted elements
    for bad in soup(["script", "style", "noscript", "iframe", "svg", "path"]):
        bad.decompose()
    
    # Remove navigation, footer, and other noise
    for noise in soup.find_all(["nav", "footer", "header"], class_=True):
        noise.decompose()
    
    # Extract text with proper structure
    lines = []
    
    # Process headings with proper formatting
    for heading in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"]):
        text = heading.get_text(" ", strip=True)
        if text and len(text) > 2:
            lines.append(f"\n{text}\n")
    
    # Process paragraphs
    for p in soup.find_all("p"):
        text = p.get_text(" ", strip=True)
        if text and len(text) > 10:
            lines.append(f"{text}\n")
    
    # Process lists
    for ul in soup.find_all(["ul", "ol"]):
        for li in ul.find_all("li", recursive=False):
            text = li.get_text(" ", strip=True)
            if text:
                lines.append(f"• {text}")
        lines.append("")  # Empty line after list
    
    # Process tables
    for table in soup.find_all("table"):
        for row in table.find_all("tr"):
            cells = row.find_all(["td", "th"])
            if cells:
                row_text = " | ".join(cell.get_text(" ", strip=True) for cell in cells if cell.get_text(strip=True))
                if row_text:
                    lines.append(row_text)
        lines.append("")  # Empty line after table
    
    # Process divs and other containers (fallback)
    for div in soup.find_all(["div", "section", "article"]):
        # Skip if already processed (has headings, paragraphs, etc.)
        if div.find_all(["h1", "h2", "h3", "h4", "h5", "h6", "p", "ul", "ol", "table"]):
            continue
        text = div.get_text(" ", strip=True)
        if text and len(text) > 20:
            lines.append(f"{text}\n")
    
    # Clean up the text
    cleaned_lines = []
    for line in lines:
        # Remove excessive whitespace
        line = re.sub(r'\s+', ' ', line).strip()
        # Skip empty lines and very short lines
        if line and len(line) > 2:
            cleaned_lines.append(line)
    
    # Join with proper spacing
    result = "\n".join(cleaned_lines)
    
    # Final cleanup
    result = re.sub(r'\n{3,}', '\n\n', result)  # Max 2 consecutive newlines
    result = re.sub(r' {2,}', ' ', result)  # Remove multiple spaces
    
    # If extraction failed, fallback to basic text extraction
    if len(result.strip()) < 100:
        result = "\n".join(
            line.strip() 
            for line in soup.get_text("\n").splitlines() 
            if line.strip() and len(line.strip()) > 2
        )
        result = re.sub(r'\s+', ' ', result)
        result = re.sub(r'\n{3,}', '\n\n', result)
    
    return result.strip()


def _decode_obfuscated_email(fragment: str) -> str | None:
    """Handle common 'user [at] domain [dot] com' patterns in text."""
    t = fragment.strip()
    if not t:
        return None
    t = re.sub(r"\s*\[\s*at\s*\]\s*", "@", t, flags=re.I)
    t = re.sub(r"\s*\(\s*at\s*\)\s*", "@", t, flags=re.I)
    t = re.sub(r"\s*\[\s*dot\s*\]\s*", ".", t, flags=re.I)
    t = re.sub(r"\s*\(\s*dot\s*\)\s*", ".", t, flags=re.I)
    if "@" in t and "." in t.split("@", 1)[-1]:
        m = EMAIL_PATTERN.search(t.replace(" ", ""))
        return m.group(0) if m else None
    return None


def _emails_from_mailto(href: str) -> list[str]:
    href = href.strip()
    if not href.lower().startswith("mailto:"):
        return []
    rest = href[7:].split("?", 1)[0].strip()
    if not rest:
        return []
    # mailto:a@b.com,c@d.com
    out: list[str] = []
    for part in rest.split(","):
        part = unquote(part.strip())
        if EMAIL_PATTERN.fullmatch(part) and _plausible_email(part):
            out.append(part.lower())
        elif m := EMAIL_PATTERN.search(part):
            e = m.group(0)
            if _plausible_email(e):
                out.append(e.lower())
    return out


def _phones_from_tel(href: str) -> list[str]:
    href = href.strip()
    if not href.lower().startswith("tel:"):
        return []
    raw = href[4:].split(";", 1)[0].strip()
    if not raw:
        return []
    # Keep a readable form; strip only obvious URL noise
    cleaned = re.sub(r"[\s]+", " ", raw)
    return [cleaned] if any(ch.isdigit() for ch in cleaned) else []


def _clean_label(s: str, max_len: int = 140) -> str:
    s = re.sub(r"\s+", " ", s).strip(" -:–—|•\t")
    if len(s) > max_len:
        s = s[: max_len - 1] + "…"
    return s


def _looks_like_phone_or_email_only(text: str) -> bool:
    t = text.strip()
    if not t:
        return True
    if EMAIL_PATTERN.fullmatch(t) and _plausible_email(t.lower()):
        return True
    digits = sum(ch.isdigit() for ch in t)
    if digits >= 7 and digits / max(len(t), 1) > 0.5:
        return True
    return False


def _label_for_anchor(tag: Tag) -> str:
    for attr in ("aria-label", "title"):
        v = tag.get(attr)
        if v and str(v).strip():
            return _clean_label(str(v)) or "General contact"

    link_txt = tag.get_text(" ", strip=True)
    if link_txt and not _looks_like_phone_or_email_only(link_txt):
        return _clean_label(link_txt) or "General contact"

    cell = tag.find_parent("td") or tag.find_parent("th")
    if cell:
        row = cell.find_parent("tr")
        if row:
            cells = row.find_all(["td", "th"], recursive=False)
            try:
                idx = cells.index(cell)
                if idx > 0:
                    prev_lab = cells[idx - 1].get_text(" ", strip=True)
                    if prev_lab and not _looks_like_phone_or_email_only(prev_lab):
                        return _clean_label(prev_lab) or "General contact"
            except ValueError:
                pass

    dd = tag.find_parent("dd")
    if dd:
        dt = dd.find_previous_sibling("dt")
        if dt:
            t = dt.get_text(" ", strip=True)
            if t:
                return _clean_label(t) or "General contact"

    prev_h = tag.find_previous(["h1", "h2", "h3", "h4", "h5"])
    if prev_h:
        t = prev_h.get_text(" ", strip=True)
        if t:
            return _clean_label(t) or "General contact"

    prev_em = tag.find_previous(["strong", "b"])
    if prev_em:
        t = prev_em.get_text(" ", strip=True)
        if t and len(t) < 160:
            return _clean_label(t) or "General contact"

    return "General contact"


def _label_from_line_prefix(line: str, match_start: int) -> str:
    prefix = line[:match_start].strip()
    prefix = re.sub(
        r"(?i)\b(?:tel|telephone|phone|mobile|fax|email|e-?mail|contact|helpline)\s*[:.\-–—]?\s*$",
        "",
        prefix,
    ).strip()
    if len(prefix) >= 3:
        return _clean_label(prefix) or "From page text"
    return "From page text"


def _label_specificity(label: str) -> tuple[int, int]:
    """Higher is better: prefer real section names over generic fallbacks."""
    generic = {"general contact", "from page text"}
    lab = label.lower()
    if lab in generic:
        return (0, len(label))
    return (1, len(label))


def _merge_contacts_by_value(entries: list[tuple[str, str, str]]) -> list[tuple[str, str, str]]:
    """One row per (kind, value), keeping the most specific label."""
    best_label: dict[tuple[str, str], str] = {}
    for kind, lab, val in entries:
        key = (kind, val.lower())
        if key not in best_label or _label_specificity(lab) > _label_specificity(best_label[key]):
            best_label[key] = lab
    out: list[tuple[str, str, str]] = []
    seen: set[tuple[str, str]] = set()
    for kind, lab, val in entries:
        key = (kind, val.lower())
        if key in seen:
            continue
        seen.add(key)
        out.append((kind, best_label[key], val))
    return out


def _format_contact_lines(entries: list[tuple[str, str, str]]) -> str:
    """entries: (kind, label, value) kind is 'Email' or 'Phone'."""
    if not entries:
        return ""
    lines = [
        "--- Extracted contact details (who to contact — use these labels when answering) ---",
        "Each line ties a department or role to an email or phone number from this page.",
    ]
    for kind, label, value in entries:
        lines.append(f"{kind} — {label}: {value}")
    lines.append("--- End extracted contact details ---")
    return "\n".join(lines) + "\n\n"


def _extract_emails_and_phones(soup: BeautifulSoup, body_text: str, page_title: str) -> str:
    """Collect labeled emails and phones (mailto/tel, table cells, headings, line context)."""
    # (kind, label, value) — value normalized for dedupe
    seen: set[tuple[str, str, str]] = set()
    ordered: list[tuple[str, str, str]] = []

    def add(kind: str, label: str, value: str) -> None:
        value = value.strip()
        if not value:
            return
        lab = _clean_label(label) or "General contact"
        key = (kind, lab.lower(), value.lower())
        if key in seen:
            return
        seen.add(key)
        ordered.append((kind, lab, value))

    for tag in soup.find_all("a", href=True):
        if not isinstance(tag, Tag):
            continue
        href = tag.get("href") or ""
        lab = _label_for_anchor(tag)
        for e in _emails_from_mailto(href):
            add("Email", lab, e)
        for p in _phones_from_tel(href):
            add("Phone", lab, p)

        link_txt = tag.get_text(" ", strip=True)
        if link_txt:
            for m in EMAIL_PATTERN.finditer(link_txt):
                e = m.group(0).lower()
                if _plausible_email(e):
                    add("Email", lab, e)
            for pat in PHONE_PATTERNS:
                for m in pat.finditer(link_txt):
                    add("Phone", lab, m.group(0).strip())

    scan_lines = [page_title, *body_text.splitlines()]
    for line in scan_lines:
        line = line.strip()
        if not line:
            continue
        for m in EMAIL_PATTERN.finditer(line):
            e = m.group(0).lower()
            if not _plausible_email(e):
                continue
            add("Email", _label_from_line_prefix(line, m.start()), e)

        for pat in PHONE_PATTERNS:
            for m in pat.finditer(line):
                add("Phone", _label_from_line_prefix(line, m.start()), m.group(0).strip())

    for line in body_text.splitlines():
        if "[at]" in line.lower() or "(at)" in line.lower():
            if dec := _decode_obfuscated_email(line):
                if _plausible_email(dec):
                    low = line.lower()
                    pos = low.find("[at]")
                    if pos < 0:
                        pos = low.find("(at)")
                    if pos < 0:
                        pos = 0
                    add("Email", _label_from_line_prefix(line, pos), dec.lower())

    return _format_contact_lines(_merge_contacts_by_value(ordered))


def _is_pagination_link(url: str) -> bool:
    return any(key in url.lower() for key in ["page=", "/page/", "next", "older"])


def _is_pdf(url: str) -> bool:
    return url.lower().split("?")[0].endswith(".pdf")


def _same_domain(url: str) -> bool:
    host = urlparse(url).netloc.lower()
    return host in ALLOWED_HOSTS


def _is_cuk(url: str) -> bool:
    host = urlparse(url).netloc.lower()
    return "cukashmir.ac.in" in host


def _is_spa_hash_route(url: str) -> bool:
    parsed = urlparse(url)
    return _is_cuk(url) and bool(parsed.fragment and parsed.fragment.startswith("/"))


def _render_spa_html(url: str, context, max_retries: int = 3) -> str | None:
    """Render an Angular hash-route page using a long-lived browser ``context``.

    The caller owns ``context`` (a persistent Playwright browser context shared
    across many URLs by one worker thread); we only open/close a page per render.
    ``context`` may be ``None`` when Playwright is unavailable, in which case the
    caller falls back to the shell HTML returned by httpx.
    """
    if context is None:
        return None

    try:
        from playwright.sync_api import TimeoutError as PlaywrightTimeout
    except Exception:
        PlaywrightTimeout = Exception

    for attempt in range(max_retries):
        page = None
        try:
            page = context.new_page()
            # Navigate with timeout
            page.goto(url, wait_until="domcontentloaded", timeout=45000)

            # Wait for content to load (adaptive wait)
            try:
                # Wait for main content to appear
                page.wait_for_selector("body", timeout=10000)
                # Give Angular time to render
                page.wait_for_timeout(5000)

                # Additional wait if page is still loading
                if page.evaluate("() => document.readyState") != "complete":
                    page.wait_for_load_state("networkidle", timeout=10000)
            except PlaywrightTimeout:
                logger.warning(f"Timeout waiting for content on {url}, attempt {attempt + 1}/{max_retries}")
                if attempt < max_retries - 1:
                    continue

            html = page.content()

            # Verify we got actual content
            if len(html) > 1000:  # Minimum content threshold
                return html
            logger.warning(f"Insufficient content from {url}, attempt {attempt + 1}/{max_retries}")
            if attempt < max_retries - 1:
                continue
            return None
        except Exception as exc:
            logger.warning(f"SPA render failed for {url} (attempt {attempt + 1}/{max_retries}): {exc}")
            if attempt < max_retries - 1:
                continue
            return None
        finally:
            if page is not None:
                try:
                    page.close()
                except Exception:
                    pass

    return None


CUK_KEYWORDS = [
    "/admission",
    "/admissions",
    "/notice",
    "/notices",
    "/exam",
    "/examination",
    "/result",
    "/results",
    "/department",
    "/school",
    "/faculty",
    "/program",
    "/programme",
    "/course",
    "/syllabus",
    "/contact",
    "/about",
]

# Stricter link filter for non-CUK allowed hosts (e.g. UGC notices/admissions/exams).
UGC_KEYWORDS = ["/admission", "/notice", "/notices", "/exam", "/examination"]


def _fetch_with_retry(client: httpx.Client, url: str, max_retries: int = 3) -> httpx.Response | None:
    """Fetch URL with retry logic and exponential backoff."""
    import time
    
    for attempt in range(max_retries):
        try:
            res = client.get(url)
            if res.status_code < 400:
                return res
            elif res.status_code >= 500 and attempt < max_retries - 1:
                # Server error, retry
                wait_time = 2 ** attempt  # Exponential backoff: 1s, 2s, 4s
                logger.warning(f"Server error {res.status_code} for {url}, retrying in {wait_time}s...")
                time.sleep(wait_time)
                continue
            else:
                logger.warning(f"HTTP {res.status_code} for {url}")
                return None
        except httpx.TimeoutException:
            if attempt < max_retries - 1:
                logger.warning(f"Timeout for {url}, retrying...")
                time.sleep(2 ** attempt)
                continue
            else:
                logger.warning(f"Timeout for {url} after {max_retries} attempts")
                return None
        except Exception as exc:
            if attempt < max_retries - 1:
                logger.warning(f"Request failed for {url}: {exc}, retrying...")
                time.sleep(2 ** attempt)
                continue
            else:
                logger.warning(f"Request failed for {url} after {max_retries} attempts: {exc}")
                return None
    
    return None


def _resolve_worker_count() -> int:
    """Number of parallel workers. Override with the CUK_SCRAPE_WORKERS env var."""
    raw = os.environ.get("CUK_SCRAPE_WORKERS")
    if raw:
        try:
            n = int(raw)
            if n >= 1:
                return n
        except ValueError:
            logger.warning("Invalid CUK_SCRAPE_WORKERS=%r, using default %d", raw, DEFAULT_WORKERS)
    return DEFAULT_WORKERS


_BROWSER_WARNED = False


def _open_browser():
    """Start a persistent Playwright browser + context for one worker thread.

    Returns ``(playwright, browser, context)`` or ``(None, None, None)`` when
    Playwright is unavailable or fails to launch. Each worker owns its own
    browser because Playwright's sync API is not safe to share across threads.
    """
    global _BROWSER_WARNED
    try:
        from playwright.sync_api import sync_playwright
    except Exception:
        if not _BROWSER_WARNED:
            _BROWSER_WARNED = True
            logger.warning(
                "Playwright not installed; SPA hash routes will be fetched as shell HTML. "
                "Install playwright and run `playwright install chromium` for full scrape."
            )
        return None, None, None
    try:
        pw = sync_playwright().start()
        browser = pw.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        )
        context = browser.new_context(
            ignore_https_errors=True,
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        return pw, browser, context
    except Exception as exc:
        logger.warning(f"Failed to launch Playwright browser: {exc}")
        return None, None, None


def _close_browser(pw, browser, context) -> None:
    for resource in (context, browser):
        if resource is not None:
            try:
                resource.close()
            except Exception:
                pass
    if pw is not None:
        try:
            pw.stop()
        except Exception:
            pass


def _extract_links(soup: BeautifulSoup, base_url: str) -> list[str]:
    """Return absolute http candidate URLs discovered on a page (fragments stripped)."""
    out: list[str] = []
    try:
        for link in soup.find_all("a", href=True):
            href = link.get("href", "").strip()
            if not href:
                continue
            abs_url = urljoin(base_url, href).split("#")[0]
            if abs_url.startswith("http"):
                out.append(abs_url)
    except Exception as exc:
        logger.warning(f"Failed to extract links from {base_url}: {exc}")
    return out


def _process_url(url: str, client: httpx.Client, context) -> tuple[bool, int, list[str]]:
    """Fetch, render (if SPA), parse, and save one URL.

    Returns ``(saved_page, body_chars, discovered_links)``. PDFs and skipped
    pages report ``saved_page=False`` and no links, matching the original
    serial crawler's semantics.
    """
    res = _fetch_with_retry(client, url)
    if res is None:
        return False, 0, []

    if _is_pdf(url):
        pdf_name = _safe_name(url).replace(".txt", ".pdf")
        pdf_path = DATA_DIR / pdf_name
        try:
            pdf_path.write_bytes(res.content)
            logger.info("Saved PDF: %s", pdf_name)
        except Exception as exc:
            logger.warning("Failed to save PDF %s: %s", url, exc)
        return False, 0, []  # PDFs do not yield further links

    raw_html = res.text

    # Enhanced SPA handling
    if _is_spa_hash_route(url):
        logger.info(f"Rendering SPA page: {url}")
        rendered = _render_spa_html(url, context)
        if rendered and len(rendered) > len(raw_html):
            raw_html = rendered
            logger.info(f"Successfully rendered SPA content ({len(rendered)} chars)")

    try:
        soup = BeautifulSoup(raw_html, "html.parser")
        page_title = soup.title.get_text(strip=True) if soup.title else "Untitled"

        # Clean up title
        page_title = re.sub(r'\s+', ' ', page_title).strip()
        if len(page_title) > 200:
            page_title = page_title[:197] + "..."

        body_text = _extract_text(soup)
    except Exception as exc:
        logger.error(f"Failed to process {url}: {exc}")
        return False, 0, []

    # Verify we got meaningful content
    if len(body_text.strip()) < 50:
        logger.warning(f"Insufficient content from {url}, skipping...")
        return False, 0, []

    try:
        contact_block = _extract_emails_and_phones(soup, body_text, page_title)
        now = datetime.now(timezone.utc).isoformat()

        txt_path = DATA_DIR / _safe_name(url)
        txt_path.write_text(
            f"Source URL: {url}\nPage Title: {page_title}\nDate Scraped: {now}\n\n"
            f"{contact_block}{body_text}",
            encoding="utf-8",
        )
    except Exception as exc:
        logger.error(f"Failed to save {url}: {exc}")
        return False, 0, []

    return True, len(body_text), _extract_links(soup, url)


def _enqueue_links(candidates: list[str], state: dict) -> None:
    """Filter and append discovered links to the shared queue. Caller holds the lock."""
    queue: deque = state["queue"]
    visited: set[str] = state["visited"]
    pdf_seen: set[str] = state["pdf_seen"]
    for abs_url in candidates:
        if _is_pdf(abs_url):
            if abs_url not in pdf_seen:
                pdf_seen.add(abs_url)
                queue.append(abs_url)
            continue
        if not _same_domain(abs_url):
            continue
        if abs_url in visited:
            continue
        if _is_cuk(abs_url):
            # For CUK, follow a richer set of paths (admissions, departments, exams, contact, etc.)
            if _is_pagination_link(abs_url) or any(key in abs_url.lower() for key in CUK_KEYWORDS):
                queue.append(abs_url)
        else:
            # For UGC (or other allowed hosts), keep to the stricter notices/admissions/exam filters.
            if _is_pagination_link(abs_url) or any(key in abs_url.lower() for key in UGC_KEYWORDS):
                queue.append(abs_url)


def _worker(cond: threading.Condition, state: dict, max_pages: int) -> None:
    """Pull URLs from the shared queue and process them until the crawl drains.

    Each worker owns its own httpx client and (if available) a persistent
    Playwright browser, reused for every URL it handles. The shared queue /
    visited / counters are guarded by ``cond``; a worker waiting on an empty
    queue sleeps until another worker publishes newly discovered links or the
    queue is confirmed drained (no work in flight).
    """
    client = httpx.Client(timeout=30, follow_redirects=True, headers=HTTP_HEADERS)
    pw, browser, context = _open_browser()
    try:
        while True:
            # Reserve the next URL to process, or wait/exit.
            with cond:
                while True:
                    if state["pages_done"] >= max_pages:
                        return
                    if state["queue"]:
                        url = state["queue"].popleft()
                        if url in state["visited"]:
                            continue
                        state["visited"].add(url)
                        state["in_flight"] += 1
                        break
                    # Queue empty: only exit if nothing is in flight that could
                    # publish more work; otherwise wait for a publisher.
                    if state["in_flight"] == 0:
                        return
                    cond.wait()

            try:
                saved, body_chars, links = _process_url(url, client, context)
            except Exception as exc:
                logger.error(f"Worker failed on {url}: {exc}")
                saved, body_chars, links = False, 0, []

            with cond:
                state["in_flight"] -= 1
                if saved:
                    state["pages_done"] += 1
                    logger.info(
                        "Saved page %d/%d: %s (%d chars)",
                        state["pages_done"], max_pages, url, body_chars,
                    )
                _enqueue_links(links, state)
                cond.notify_all()
    finally:
        client.close()
        _close_browser(pw, browser, context)


def crawl() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    state: dict = {
        "queue": deque(SEED_URLS),
        "visited": set(),
        "pdf_seen": set(),
        "pages_done": 0,
        "in_flight": 0,
    }
    cond = threading.Condition()
    workers = _resolve_worker_count()
    max_pages = MAX_PAGES

    logger.info("Crawling with %d parallel workers (max pages: %d)...", workers, max_pages)
    with ThreadPoolExecutor(max_workers=workers, thread_name_prefix="cuk") as pool:
        futures = [pool.submit(_worker, cond, state, max_pages) for _ in range(workers)]
        for future in futures:
            future.result()  # surface any worker exceptions

    logger.info("Crawl finished. Pages saved: %d, PDFs queued: %d", state["pages_done"], len(state["pdf_seen"]))
    logger.info("Total URLs visited: %d", len(state["visited"]))


if __name__ == "__main__":
    crawl()
