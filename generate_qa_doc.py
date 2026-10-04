from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

doc = Document()

# Page margins
section = doc.sections[0]
section.top_margin = Inches(1)
section.bottom_margin = Inches(1)
section.left_margin = Inches(1.2)
section.right_margin = Inches(1.2)

def set_font(run, name='Calibri', size=11, bold=False, color=None):
    run.font.name = name
    run.font.size = Pt(size)
    run.font.bold = bold
    if color:
        run.font.color.rgb = RGBColor(*color)

def add_title(doc, text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(text)
    set_font(run, size=20, bold=True, color=(0, 51, 102))
    p.space_after = Pt(6)

def add_subtitle(doc, text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(text)
    set_font(run, size=13, color=(80, 80, 80))
    p.space_after = Pt(4)

def add_category_heading(doc, text):
    p = doc.add_paragraph()
    run = p.add_run(text)
    set_font(run, size=14, bold=True, color=(0, 102, 51))
    p.space_before = Pt(14)
    p.space_after = Pt(6)

def add_question(doc, text):
    p = doc.add_paragraph()
    run = p.add_run(text)
    set_font(run, size=11, bold=True, color=(0, 51, 153))
    p.space_before = Pt(10)
    p.space_after = Pt(2)

def add_answer(doc, text):
    p = doc.add_paragraph()
    run = p.add_run(text)
    set_font(run, size=11, color=(30, 30, 30))
    p.space_after = Pt(6)
    p.paragraph_format.left_indent = Inches(0.3)

def add_divider(doc):
    p = doc.add_paragraph()
    pPr = p._p.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    bottom = OxmlElement('w:bottom')
    bottom.set(qn('w:val'), 'single')
    bottom.set(qn('w:sz'), '4')
    bottom.set(qn('w:space'), '1')
    bottom.set(qn('w:color'), 'CCCCCC')
    pBdr.append(bottom)
    pPr.append(pBdr)
    p.space_after = Pt(0)

# ─── TITLE PAGE ───────────────────────────────────────────────────────────────
add_title(doc, "ShadowGuard")
add_subtitle(doc, "Judge Questions & Answers — Bangla")
add_subtitle(doc, "AFM AI Hackathon 2026 | Farabi Hub, Almaty")
add_subtitle(doc, "June 24–25, 2026 | Direction 1: Digital Shadow")
doc.add_paragraph()
add_divider(doc)
doc.add_paragraph()

qa_data = [
    ("CATEGORY 1 — General & Business", [
        (
            "Q1. আপনি ৬টি crime type cover করছেন। গুরুত্বপূর্ণ project সাধারণত একটিতে focus করে। Broad হওয়া কি risk নয়?",
            "কাজাখস্তানের financial crime গুলো একে অপরের সাথে সংযুক্ত — একজন dropper একটি pyramid scheme-এর টাকা পাচার করে, যেটা আবার একটি crypto exchange ব্যবহার করছে। প্রতিটি module আলাদাভাবে কাজ করে, কিন্তু একটি shared entity system দিয়ে সংযুক্ত। এটা ব্যাপকতার জন্য নয় — এটা interconnected crime detection। ৬টি module মিলে একটি complete picture দেয় যা একটি module কখনো দিতে পারবে না।"
        ),
        (
            "Q2. Actual measurable impact কী? ShadowGuard ছাড়া AFM কতজন criminal ধরতে পারত?",
            "আমরা specific সংখ্যা claim করছি না — এটা honest হবে না। কিন্তু পরিমাপযোগ্য impact হলো: একজন analyst যেখানে ম্যানুয়ালি ১০টি channel monitor করতে পারেন, ShadowGuard সেখানে ১,০০০+ monitor করে। Demo scenario-তে KOLKHOZ ১৪ ঘণ্টা আগে এবং PIRAMIDA ৬ মাস আগে alert দিয়েছে। Real deployment-এ AFM-এর historical data দিয়ে actual ROI পরিমাপ করা যাবে।"
        ),
        (
            "Q3. AFM-এর কাছে তো investigation tool আছেই। ShadowGuard কেন add করবে?",
            "বিদ্যমান tool গুলো reactive — অভিযোগ আসার পরে তদন্ত শুরু হয়। ShadowGuard proactive — অভিযোগ আসার আগেই signal detect করে। এটা replacement নয়, augmentation। বিদ্যমান workflow-এ ShadowGuard alert দেয়, analyst তখন তাদের existing tool দিয়ে গভীর তদন্ত করেন।"
        ),
        (
            "Q4. ১৪৪ ঘণ্টায় এটা বানিয়েছেন। কতটুকু real আর কতটুকু copy-paste?",
            "Core architecture, ৬টি scoring engine, ML model training pipeline, investigation console, entity correlation system — সবই এই hackathon-এ লেখা হয়েছে। Open-source library ব্যবহার করা হয়েছে (FastAPI, scikit-learn, NetworkX, React) — এটা software development-এর স্বাভাবিক নিয়ম, যেমন একজন builder নিজে ইট তৈরি করেন না। ML model ৫৭৮টি custom-curated sample দিয়ে আমরাই train করেছি।"
        ),
        (
            "Q5. Hackathon-এর পরে AFM কীভাবে এটা adopt করবে? Go-to-market strategy কী?",
            "প্রথম ধাপ: AFM-এর IT বিভাগের সাথে technical review। দ্বিতীয় ধাপ: একটি module (PIRAMIDA সুপারিশ করব) দিয়ে pilot deployment — real data দিয়ে ৩ মাস test। তৃতীয় ধাপ: AFM feedback অনুযায়ী পরিমার্জন। চতুর্থ ধাপ: বাকি ৫ module rollout। এই roadmap AFM-এর procurement process-এর সাথে সামঞ্জস্যপূর্ণ।"
        ),
        (
            "Q6. End user কি technical analyst নাকি non-technical officer? UI কার জন্য?",
            "UI দুই ধরনের user-এর কথা মাথায় রেখে design করা হয়েছে। Non-technical officer Risk Score badge এবং সহজ বাংলায় summary দেখেন। Technical analyst Raw JSON, entity graph, এবং ML confidence distribution দেখেন। Role-based access control নিশ্চিত করে যে প্রত্যেকে শুধু তার প্রয়োজনীয় তথ্য দেখেন।"
        ),
        (
            "Q7. False alert-এর ভিত্তিতে AFM innocent business-এর বিরুদ্ধে পদক্ষেপ নিলে কী হবে?",
            "ShadowGuard কোনো স্বয়ংক্রিয় legal action নেয় না — এটা শুধু analyst-কে সংকেত দেয়। চূড়ান্ত সিদ্ধান্ত সর্বদা মানব বিশ্লেষক নেন। এছাড়া threshold (যেমন PIRAMIDA-তে ৭০) সতর্কভাবে নির্ধারণ করা হয়েছে false positive কমাতে। Audit log-এ প্রতিটি action রেকর্ড থাকে — accountability নিশ্চিত।"
        ),
        (
            "Q8. Chainalysis, TRM Labs, Recorded Future-এর সাথে পার্থক্য কী?",
            "এই platform গুলো global, ব্যয়বহুল, এবং Kazakhstan-specific নয়। ShadowGuard তিনটি কারণে আলাদা: প্রথমত, ১০০% offline — data বাইরে যায় না। দ্বিতীয়ত, কাজাখস্তানের নির্দিষ্ট crime pattern, ভাষা (KZ/RU/EN), এবং registry (AIFC, KG, EGOV)-এর জন্য তৈরি। তৃতীর্তর্ত, AFM-এর budget-এর মধ্যে open-source stack-এ deploy করা সম্ভব।"
        ),
    ]),
    ("CATEGORY 2 — AI / ML", [
        (
            "Q9. ৫৭৮ training sample ৭টি class-এর জন্য খুবই কম। Production-এ কীভাবে trust করব?",
            "৫৭৮ sample ছোট কিন্তু domain-specific এবং curated। TF-IDF + Logistic Regression-এর মতো classical model-এর জন্য এই পরিমাণ যথেষ্ট ভালো baseline দেয় — verified করা হয়েছে ৯৬.৭১% cross-validated accuracy দিয়ে। Production-এ AFM-এর real case data দিয়ে continuously retrain করা হবে। ৫৭৮ শুরু, শেষ নয়।"
        ),
        (
            "Q10. TF-IDF + Logistic Regression মানে ২০১০-এর technology। কেন modern LLM ব্যবহার করেননি?",
            "AFM-এর environment-এ LLM চালানো practical নয় — একটি large model-এর জন্য GPU server লাগে, internet connection লাগে বা large local deployment। TF-IDF + LogReg সম্পূর্ণ offline, একটি সাধারণ laptop-এ মিলিসেকেন্ডে চলে, এবং interpretable। ৯৬.৭১% accuracy-র জন্য LLM প্রয়োজন নেই। সঠিক tool সঠিক কাজে।"
        ),
        (
            "Q11. আপনার নিজের dataset-এ ৯৬.৭১%। Real AFM data-তে কত হবে?",
            "এটা honest প্রশ্ন — আমরা জানি না। ৫-fold cross-validation honest estimate দেয়, কিন্তু real-world distribution আলাদা হতে পারে। তাই আমরা pilot deployment সুপারিশ করি — ৩ মাস real AFM data দিয়ে test করলে actual performance জানা যাবে। ShadowGuard-এ validate.py script আছে যা নতুন data-তে accuracy পরিমাপ করতে পারে।"
        ),
        (
            "Q12. Model কি সত্যিই Kazakh ভাষা handle করতে পারে?",
            "Training data কাজাখ/রুশ/ইংরেজি তিন ভাষায় curated করা হয়েছে। preprocess_text() function NFKC Unicode normalization করে যা Cyrillic/Latin lookalike character গুলো handle করে। তবে pure Kazakh (কিরিল script-এ) content কম ছিল training-এ — এটা পরিচিত সীমাবদ্ধতা। AFM Kazakh-language samples যোগ করলে performance উন্নত হবে।"
        ),
        (
            "Q13. Criminal ভাষা evolve করে। ৬ মাসে slang বদলালে কী করবেন?",
            "ShadowGuard-এ train.py এবং validate.py script আছে। নতুন labeled sample যোগ করে যেকোনো সময় retrain করা যায় — ৩০ মিনিটের কাজ। Rule-based scoring-এর keyword list-ও update করা যায় config file-এ। Model retraining pipeline সম্পূর্ণ automated। এটা একবারের system নয়, continuously improving system।"
        ),
        (
            "Q14. Offline model চালাতে AFM-এর কী hardware লাগবে?",
            "Minimum requirement: ৮GB RAM, যেকোনো modern CPU, ৫০GB storage। GPU প্রয়োজন নেই। একটি standard office laptop-এ চলে। Production-এ একটি dedicated server (8-core CPU, 32GB RAM) পুরো AFM-এর load handle করতে পারবে। Cloud dependency শূন্য।"
        ),
        (
            "Q15. Model ৯৭% confidence-এ ভুল করলে? এটা বিপজ্জনক নয়?",
            "High confidence wrong prediction সব ML model-এই হয়। তাই ShadowGuard-এ low_confidence flag আছে — confidence ৫০%-এর নিচে হলে AI panel-এ স্পষ্ট warning দেখায়। আরো গুরুত্বপূর্ণ: AI output শুধু analyst-কে inform করে, automatically action নেয় না। মানব বিশ্লেষক চূড়ান্ত বিচার করেন।"
        ),
        (
            "Q16. Train/test split কী? সত্যিকারের held-out dataset ব্যবহার করেছেন?",
            "৫-fold Stratified K-Fold Cross-Validation ব্যবহার করা হয়েছে — এটা ৫টি আলাদা held-out set-এ test করে। এটা single train/test split-এর চেয়ে বেশি reliable। তবে সম্পূর্ণ আলাদা একটি external test set নেই — এটা পরিচিত সীমাবদ্ধতা। AFM real data দিয়ে সেই external validation করা সম্ভব।"
        ),
        (
            "Q17. Model কি pyramid scheme সম্পর্কে আলোচনা বনাম pyramid scheme চালানোর মধ্যে পার্থক্য করতে পারে?",
            "এটা একটি চমৎকার প্রশ্ন। TF-IDF + LogReg ভাষার ছাঁচ দেখে — promotional language ('যোগ দিন', 'গ্যারান্টি', 'রেফার করুন') এবং analytical language ('pyramid scheme হলো', 'বিপদজনক') আলাদা pattern তৈরি করে। Training data-তে এই উভয় ধরনের উদাহরণ রাখা হয়েছে। তবে edge case-এ ভুল হতে পারে।"
        ),
        (
            "Q18. Baseline কী? শুধু 'Kaspi' শব্দ flag করলে কত accuracy পাওয়া যায়?",
            "শুধু keyword matching দিয়ে precision খুব কম হয় — অনেক legitimate content-এ 'Kaspi' আছে। আমাদের model-এর সুবিধা: context বোঝে, শুধু শব্দ নয়। উদাহরণ: 'Kaspi-তে সমস্যা হচ্ছে' (neutral) বনাম 'Kaspi card দিয়ে cashout করুন, ১৫,০০০ পাবেন' (dropper) — model দুটো আলাদা করতে পারে, keyword matching পারে না।"
        ),
    ]),
    ("CATEGORY 3 — Technical & Architecture", [
        (
            "Q19. Telegram scraping তাদের Terms of Service লঙ্ঘন করে। এটা legally কীভাবে handle করবেন?",
            "Telegram-এর Bot API এবং official MTProto API সরকারি সংস্থার জন্য ব্যবহারযোগ্য — ToS লঙ্ঘন public scraping-এর ক্ষেত্রে প্রযোজ্য। অনেক দেশের law enforcement Telegram-এর সাথে official agreement-এর মাধ্যমে data access করে। AFM একটি সরকারি সংস্থা হিসেবে এই ধরনের agreement করতে পারে। বর্তমানে আমরা public channel data scan করি — private message নয়।"
        ),
        (
            "Q20. Demo simulated data দিয়ে। Real live data কবে থেকে কাজ করবে?",
            "Architecture এবং pipeline সম্পূর্ণ। Live data চালু করতে লাগবে: Telegram Bot API token (১ দিন), blockchain API key (১ দিন), Tor configuration (১ সপ্তাহ), AIFC API access (AFM-এর সহযোগিতায় ২-৪ সপ্তাহ)। Realistic timeline: AFM support-এ ৪-৬ সপ্তাহে সম্পূর্ণ live deployment সম্ভব।"
        ),
        (
            "Q21. Celery worker crash করলে? Task restart হয়? Data হারায়?",
            "Celery-র built-in retry mechanism আছে। Task status module_tasks table-এ persist হয় — crash হলেও status 'started' থাকে, analyst দেখতে পান। Production configuration-এ auto-retry এবং dead letter queue যোগ করা হবে। বর্তমান prototype-এ এটা fully configured নয় — পরিচিত gap।"
        ),
        (
            "Q22. PostgreSQL কি national-scale-এ millions of messages handle করতে পারবে?",
            "বর্তমান architecture-এ সব raw message store হয় না — শুধু processed findings এবং metadata। তাই PostgreSQL যথেষ্ট। ভবিষ্যতে large-scale streaming লাগলে Apache Kafka বা TimescaleDB যোগ করা যাবে। কিন্তু AFM-এর প্রাথমিক use case-এর জন্য PostgreSQL দিয়েই শুরু করা যুক্তিসংগত।"
        ),
        (
            "Q23. Production-এ Telegram বা blockchain API-এর rate limiting কীভাবে handle করবেন?",
            "বর্তমান code-এ basic rate limiting আছে। Production-এ exponential backoff, request queuing, এবং multiple API key rotation যোগ করতে হবে। এটা একটি known engineering task — solved problem। Celery-র task scheduling দিয়ে request distribution করা যায়।"
        ),
        (
            "Q24. AIFC registry check 'partially implemented' মানে ঠিক কী — কাজ করে নাকি করে না?",
            "HTTP check code আছে validate_entity() function-এ। কিন্তু AIFC-এর public-facing API limited — সব entity type check করা যায় না। সম্পূর্ণ integration-এর জন্য AIFC-এর official API access দরকার যা শুধু AFM দিতে পারে। বর্তমানে: কিছু check কাজ করে, কিছু করে না। Production-এ সম্পূর্ণ করতে AFM-এর সহযোগিতা লাগবে।"
        ),
        (
            "Q25. একই wallet DROPER এবং TENGRAF-এ দেখা গেলে। এটা কি নিশ্চিতভাবে একই criminal?",
            "নিশ্চিতভাবে নয় — কিন্তু উচ্চ সম্ভাবনা। shared_entities table-এ entity value exact match করে। একই TRON wallet address দুটো সম্পূর্ণ আলাদা context-এ দেখা দেওয়া rare। Investigation console-এ analyst entity graph দেখে নিজে বিচার করেন — system automatically claim করে না 'এটা একই ব্যক্তি।'"
        ),
        (
            "Q26. Latency কত? Criminal post করার পরে alert কতক্ষণে আসে?",
            "বর্তমান architecture-এ: analyst manually scan trigger করেন → Celery task চলে → ২-৫ মিনিটে result আসে। Real-time streaming architecture-এ (future) WebSocket দিয়ে seconds-এ alert সম্ভব। Current MVP-তে scheduled scan (যেমন প্রতি ঘণ্টায়) এবং manual scan উভয়ই আছে।"
        ),
        (
            "Q27. Redis down হলে কী হয়?",
            "Redis down হলে নতুন Celery task queue হবে না। কিন্তু চলমান task complete হতে পারে (worker memory-তে)। Production-এ Redis Sentinel বা Redis Cluster দিয়ে high availability নিশ্চিত করতে হবে। এটা একটি standard DevOps task। Prototype-এ single Redis instance ব্যবহার করা হয়েছে।"
        ),
        (
            "Q28. Simultaneous ১০, ১০০, ১,০০০ scan handle করতে পারবে?",
            "বর্তমান single Celery worker configuration-এ ১০টি simultaneous scan comfortable। ১০০-এর জন্য multiple workers এবং separate queues per module লাগবে। ১,০০০-এর জন্য distributed Celery cluster দরকার। Hackathon prototype single-user demonstration-এর জন্য — production scaling একটি separate engineering effort।"
        ),
    ]),
    ("CATEGORY 4 — Security", [
        (
            "Q29. IIN, criminal evidence — এই sensitive data কীভাবে encrypt করা?",
            "বর্তমান prototype-এ HTTPS (TLS in transit) এবং PostgreSQL-এর filesystem-level encryption আছে। Production-এ column-level encryption (pgcrypto) IIN এবং sensitive field-এর জন্য যোগ করতে হবে। Leak Monitor-এ PII মাস্কিং UI layer-এ আছে। এটা একটি known production hardening requirement।"
        ),
        (
            "Q30. Rogue analyst data leak করলে কীভাবে prevent করবেন?",
            "চারটি safeguard: প্রথমত, Role-based access control — analyst শুধু তার assigned module দেখতে পারেন। দ্বিতীয়ত, Audit log — প্রতিটি action (login, view, download) timestamp সহ রেকর্ড। তৃতীয়ত, Evidence report download করলে audit trail তৈরি হয়। চতুর্থত, Production-এ IP whitelist এবং 2FA যোগ করা হবে।"
        ),
        (
            "Q31. Criminal জানলে নতুন channel খুলবে। কীভাবে handle করবেন?",
            "Entity persistence এর মাধ্যমে। পুরনো channel-এর phone number, wallet address, writing style fingerprint shared_entities-এ থাকে। নতুন channel-এ একই entity দেখা দিলে match হয়। এটা 'whack-a-mole' problem — কিন্তু প্রতিটি নতুন channel খুলতে criminal-এর cost বাড়ে এবং পুরনো evidence chain maintain থাকে।"
        ),
        (
            "Q32. ShadowGuard নিজেই hack হলে criminal জানবে AFM কী জানে। Threat model কী?",
            "এটা serious concern। Production-এ: air-gapped deployment (internet থেকে isolated), VPN-only access, penetration testing, এবং security audit বাধ্যতামূলক। Investigation data encrypted রাখতে হবে। বর্তমান prototype-এ এই level-এর security নেই — এটা honest acknowledgment। Government deployment-এ AFM-এর IT security team এই hardening করবে।"
        ),
        (
            "Q33. Audit log monitor করে কে?",
            "Classic 'quis custodiet' প্রশ্ন। Solution: audit log আলাদা read-only database-এ যায় যেখানে analyst access নেই। শুধু auditor role এবং system admin দেখতে পারেন। Production-এ automated anomaly detection audit log-এও apply করা উচিত। বর্তমান prototype-এ এই separation partially implemented।"
        ),
        (
            "Q34. JWT token expire time কত? Token চুরি হলে?",
            "Access token: ৩০ মিনিট। Refresh token: ৭ দিন। Token চুরি হলে: refresh token revoke করলে সব active session invalid হয়। Production-এ token blacklist (Redis-এ) যোগ করা প্রয়োজন। HTTPS mandatory — plain HTTP-তে token চুরির risk থাকে।"
        ),
        (
            "Q35. Celery '-P solo' flag Windows workaround। Production-ready?",
            "না — -P solo single-threaded, development-এর জন্য। Linux production server-এ -P prefork বা -P gevent ব্যবহার করতে হবে। Windows compatibility-র জন্য এটা ছিল, কিন্তু AFM-এর production environment Linux server হবে সম্ভবত। এটা একটি configuration change — major issue নয়।"
        ),
        (
            "Q36. threat_model.joblib চুরি হলে কি attacker জানবে আমরা কী দেখছি?",
            "Partially হ্যাঁ — model weights দেখে কোন feature গুলো important বোঝা যাবে। কিন্তু training data এবং exact threshold জানা যাবে না। Production-এ model artifact encrypted storage-এ রাখতে হবে, restricted access সহ। এটা একটি valid security concern যা production hardening-এ address করতে হবে।"
        ),
        (
            "Q37. Tor সরকারি infrastructure-এ চালানো security flag তোলে। কীভাবে handle করবেন?",
            "বর্তমানে DarkNet collection এখনো বাস্তবায়ন করা হয়নি — এটা একটি future feature। Production-এ Tor traffic isolated network segment-এ চলবে, main AFM network থেকে separated। অনেক intelligence agency isolated Tor node ব্যবহার করে। AFM-এর IT security policy অনুযায়ী implementation করতে হবে।"
        ),
        (
            "Q38. IIN data-তে কার access আছে? Proper access control আছে?",
            "Leak Monitor-এ IIN default-এ masked। Unmask করতে হলে analyst role লাগে এবং প্রতিটি unmask action audit log-এ রেকর্ড হয়। Production-এ additional approval workflow যোগ করা উচিত — sensitive data দেখতে supervisor approval। বর্তমান prototype-এ শুধু role-based masking আছে।"
        ),
    ]),
    ("CATEGORY 5 — Legal & Compliance", [
        (
            "Q39. User consent ছাড়া Telegram channel monitor করা কি Kazakhstan-এর আইনে legal?",
            "Public Telegram channel-এর content publicly accessible — এটা monitor করা সাধারণত legal। Kazakhstan-এর 'Об оперативно-розыскной деятельности' আইন সরকারি সংস্থাকে public digital space monitor করার অধিকার দেয়। Private message বা closed group monitor করতে court order লাগবে। ShadowGuard শুধু public channel দেখে।"
        ),
        (
            "Q40. Kazakhstan-এর personal data protection আইন এবং GDPR — ShadowGuard কি comply করে?",
            "Kazakhstan-এর 'О персональных данных и их защите' আইন অনুযায়ী, law enforcement purpose-এ data processing permitted। GDPR KZ-তে directly applicable নয়। তবে best practice হিসেবে: data minimization, purpose limitation, এবং retention policy implement করা উচিত।"
        ),
        (
            "Q41. ShadowGuard-এর evidence কি Kazakhstan court-এ admissible?",
            "Digital evidence admissibility Kazakhstan-এর Criminal Procedure Code-এর ১১৬-১২০ ধারায় নিয়ন্ত্রিত। ShadowGuard-এর audit trail, timestamp, এবং chain of custody — এগুলো admissibility-র জন্য সহায়ক। তবে court-এ present করতে qualified digital forensic expert-এর certification লাগতে পারে। ShadowGuard প্রমাণ সংগ্রহের হাতিয়ার — final legal case তৈরি করে না।"
        ),
        (
            "Q42. মানুষকে criminal flag করার process কী? Discrimination এড়াবেন কীভাবে?",
            "ShadowGuard কোনো ব্যক্তিকে 'criminal' label করে না — শুধু content এবং pattern flag করে। Flag মানে তদন্তের সূচনা, অভিযোগ নয়। Multiple signals একসাথে trigger করে alert — single indicator নয়। Audit trail নিশ্চিত করে কোন analyst কী সিদ্ধান্ত নিয়েছেন তার accountability।"
        ),
        (
            "Q43. Foreign national-এর data process করার legal authority আছে?",
            "কাজাখস্তানে পরিচালিত criminal activity monitor করা AFM-এর jurisdiction-এ পড়ে, data subject যেখানেই থাকুক। International data transfer সংক্রান্ত bilateral agreement প্রযোজ্য হতে পারে। এটা AFM-এর legal team নির্ধারণ করবেন। ShadowGuard technical tool — jurisdiction নির্ধারণ আইনজীবীর কাজ।"
        ),
        (
            "Q44. ShadowGuard-এর data কার মালিকানায়? Analyst? AFM? সরকার?",
            "AFM government agency হিসেবে সব investigation data-র মালিক। Analyst তাদের tool হিসেবে ব্যবহার করেন। ShadowGuard (system হিসেবে) data store করে কিন্তু মালিকানা দাবি করে না। Deployment contract-এ এই ownership clearly define করতে হবে।"
        ),
    ]),
    ("CATEGORY 6 — AFM Specific", [
        (
            "Q45. STR (Suspicious Transaction Report) workflow-এর সাথে ShadowGuard কীভাবে integrate করবে?",
            "ShadowGuard একটি upstream intelligence layer। যখন alert fire হয়, analyst investigation করে evidence package তৈরি করেন। এই package STR format-এ export করার feature roadmap-এ আছে। বর্তমানে HTML evidence report generate হয় যা STR filing-এ সহায়ক দলিল হিসেবে কাজ করে।"
        ),
        (
            "Q46. AFM-এর unlicensed crypto exchange-এ jurisdiction নেই। KOLKHOZ কতটা useful?",
            "এটা সত্য — KOLKHOZ directly jurisdiction issue solve করে না। কিন্তু যখন customer complaint file করে, KOLKHOZ-এর historical alert data প্রমাণ করে যে pattern আগে থেকে ছিল। এছাড়া AIFC এবং NBK (National Bank)-এর সাথে information sharing-এ এই data কাজে আসে। Jurisdiction বাড়ানোর advocacy-তেও evidence হিসেবে ব্যবহার করা যায়।"
        ),
        (
            "Q47. PIRAMIDA victim count estimate করে। AFM action-এর legal threshold কত? ১০০? ১,০০০?",
            "এটা AFM-এর legal team এবং prosecutor office নির্ধারণ করবেন। ShadowGuard-এর victim estimate একটি priority signal — ১,০০০ victim-এর case ১০ victim-এর চেয়ে বেশি জরুরি। Threshold configuration করা যায়: AFM বলতে পারে '৫০০+ victim estimate হলে automatically escalate।'"
        ),
        (
            "Q48. একটি entity ৩ module-এ দেখা গেলে risk score কীভাবে calculate হয়?",
            "বর্তমানে প্রতিটি module আলাদাভাবে score করে — combined score formula নেই। Entity Hub-এ cross-module correlation দেখানো হয়, কিন্তু unified risk score এখনো বাস্তবায়ন করা হয়নি। Road map-এ আছে: entity যত বেশি module-এ দেখা যাবে, overall risk multiplier তত বাড়বে।"
        ),
        (
            "Q49. ৫০টি alert একদিনে fire হলে analyst কোনটা আগে দেখবেন?",
            "Alert list-এ risk score অনুযায়ী sort হয় — সর্বোচ্চ score আগে। Severity badge (critical/high/medium/low) quick visual prioritization দেয়। এছাড়া cross-module correlation আছে এমন alert আলাদাভাবে highlighted। Future feature: ML-based alert prioritization যা analyst-এর past behavior শিখবে।"
        ),
        (
            "Q50. সপ্তাহে ২০০ alert মানে কি analyst-এর কাজ বাড়বে?",
            "Valid concern। Solution: threshold tuning। PIRAMIDA-র ৭০ threshold রাখলে সপ্তাহে ৫-১০টি high-quality alert আসবে, ২০০ নয়। 'Alert fatigue' এড়াতে precision বাড়ানো এবং false positive কমানো priority। Pilot deployment-এ AFM analyst-দের feedback নিয়ে threshold calibrate করা হবে।"
        ),
    ]),
    ("CATEGORY 7 — Demo Challenges", [
        (
            "Q51. এখনই live CONTRABAND-KZ চালিয়ে real drug channel দেখান।",
            "সৎভাবে বলছি — বর্তমান সংস্করণে live Telegram scraping এখনো বাস্তবায়ন করা হয়নি। Demo mode-এ আমরা দেখাতে পারি সম্পূর্ণ analysis pipeline কীভাবে কাজ করে। Live করতে Telegram API key এবং ৪-৬ সপ্তাহের integration কাজ লাগবে। Architecture প্রস্তুত — connector শুধু plug করতে হবে।"
        ),
        (
            "Q52. Demo data fictional। System real criminal content-এ কাজ করবে এটা কীভাবে prove করবেন?",
            "ML model সত্যিকারের KZ criminal content-এর pattern দিয়ে train করা হয়েছে — demo data নয়। training_messages.csv-এ ৫৭৮টি real-world inspired labeled sample আছে। Proof: model-কে নতুন unseen text দিন — আমরা এখনই classify করে দেখাতে পারি। Pilot deployment-এই real validation হবে।"
        ),
        (
            "Q53. এই text-টি আমার দেওয়া — আপনার model কী বলে? (Judge একটি ambiguous message পড়েন)",
            "Investigation console খুলে text paste করুন, ML panel তাৎক্ষণিক result দেবে। Confidence score এবং সব ৭টি class-এর probability distribution দেখাবে। যদি low confidence দেখায় — সৎভাবে বলব 'model uncertain, analyst-এর বিচার দরকার।' এটাই system-এর honest behavior।"
        ),
        (
            "Q54. RAKS Exchange ১৪ ঘণ্টা আগে alert দিয়েছে। এই সংখ্যাটা কি hardcoded?",
            "হ্যাঁ — RAKS playback dataset-এ Sep 29 06:00-এ alert এবং Sep 30 06:00-এ AFM action hardcoded। এটা একটি fictional demo scenario যা real-world pattern demonstrate করে। আমরা এটা কখনো 'real incident' হিসেবে present করিনি। Demo-র উদ্দেশ্য: detection capability দেখানো, historical claim করা নয়।"
        ),
        (
            "Q55. Codebase খুলুন। Telegram scraping কোথায়? (pause) — নেই, তাই না?",
            "আছে — backend/app/modules/[module]/collectors/channel_searcher.py-তে collector code লেখা আছে। কিন্তু এটা demo mode-এ simulated data return করে — live Telegram API call করে না। Code structure প্রস্তুত, live API connection পরবর্তী implementation step। এটা transparent — আমরা কোথাও hide করিনি।"
        ),
    ]),
    ("CATEGORY 8 — সবচেয়ে কঠিন প্রশ্ন", [
        (
            "Q56. ShadowGuard-এ এমন একটি জিনিস বলুন যা AI ছাড়া সম্ভব হতো না।",
            "Multilingual crime text classification। Rule-based system দিয়ে KZ/RU/EN তিন ভাষায় code-switching করা criminal বার্তার ধরন চেনা সম্ভব নয় — manually সব pattern define করা অসাধ্য। ML model training-এ শিখেছে যে 'дроп карта' (Russian) এবং 'drop card' (English) একই criminal intent express করে। এটা শুধু AI দিয়ে সম্ভব।"
        ),
        (
            "Q57. ৬ মাস এবং real team পেলে কী ফেলে দিয়ে নতুন করে বানাতেন?",
            "Training data pipeline সম্পূর্ণ নতুন করে বানাতাম — আরো বড়, আরো diverse, AFM-এর real case থেকে। Collector layer-কে pluggable architecture দিতাম যাতে নতুন data source যোগ করা সহজ হয়। এবং DarkNet integration-কে properly implement করতাম isolated security architecture-সহ। ML model-এ transformer-based approach test করতাম larger dataset-এ।"
        ),
        (
            "Q58. Presentation-এ সবচেয়ে বড় যে কথাটা পুরোপুরি সত্য নয়?",
            "'৬ মডিউল কাজ করে' — technically সব ৬টি module pipeline কাজ করে, কিন্তু live data collection করে না। এটা 'working prototype' এবং 'production system'-এর মধ্যে পার্থক্য। আমরা 'demo mode' বলি — কিন্তু presentation-এর energy মাঝে মাঝে এই distinction blur করে। Judges-এর কাছে সম্পূর্ণ স্বচ্ছ থাকাই সঠিক।"
        ),
        (
            "Q59. Senior criminal আপনার presentation দেখল। কাল সে কী বদলাবে?",
            "সে তার Telegram channel-এ পরিচিত keyword গুলো এড়াবে, নতুন slang ব্যবহার করবে। নতুন wallet address তৈরি করবে। একাধিক ছোট channel-এ ভাগ হয়ে যাবে। কিন্তু: entity correlation তাকে পুরোপুরি hide হতে দেবে না — phone number, writing pattern, network structure থাকবে। আর ML model retrain হতে পারে নতুন pattern দিয়ে।"
        ),
        (
            "Q60. এক বাক্যে বলুন — ShadowGuard এমন কী করে যা AFM আজকে আপনাদের ছাড়া করতে পারে না?",
            "ShadowGuard ৬টি ভিন্ন ডিজিটাল platform থেকে real-time signal collect করে, trilingual AI দিয়ে classify করে, cross-module entity correlation দিয়ে network map তৈরি করে, এবং investigation-ready evidence package generate করে — একজন analyst-এর কাজের সময়ের মধ্যে, যেখানে এই পুরো কাজটি ম্যানুয়ালি করতে একটি পুরো team-এর সপ্তাহ লাগত।"
        ),
    ]),
]

for category, questions in qa_data:
    add_category_heading(doc, category)
    add_divider(doc)
    for q, a in questions:
        add_question(doc, q)
        add_answer(doc, a)

# Footer note
doc.add_paragraph()
add_divider(doc)
p = doc.add_paragraph()
run = p.add_run("ShadowGuard | AFM AI Hackathon 2026 | Farabi Hub, Almaty | June 24–25, 2026")
set_font(run, size=9, color=(120, 120, 120))
p.alignment = WD_ALIGN_PARAGRAPH.CENTER

output_path = r"e:\ISS course\HHHH\shadowguard\ShadowGuard_Judge_QA_Bangla.docx"
doc.save(output_path)
print(f"Saved: {output_path}")
