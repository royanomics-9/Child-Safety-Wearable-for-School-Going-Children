import { useState, useEffect, useRef } from "react";

// ─── DATA ───────────────────────────────────────────────────────────────────
const CHILDREN_DATA = [
  { id:"SP-1023", name:"Anushka Dave",     variant:"base", age:9,  battery:84, lastSeen:2,  storage:12, distress:8,   lat:12.9716, lon:77.5946 },
  { id:"SP-1024", name:"Avni Khanulia",    variant:"base", age:11, battery:62, lastSeen:5,  storage:30, distress:14,  lat:12.9740, lon:77.5980 },
  { id:"SP-1025", name:"Harleen Kaur",     variant:"pro",  age:8,  battery:45, lastSeen:1,  storage:54, distress:38,  lat:12.9680, lon:77.5910 },
  { id:"SP-1026", name:"Harshita Pansari", variant:"pro",  age:10, battery:91, lastSeen:0,  storage:8,  distress:92,  lat:12.9758, lon:77.6012 },
  { id:"SP-1027", name:"Snehal Gupta",     variant:"base", age:12, battery:73, lastSeen:9,  storage:21, distress:5,   lat:12.9700, lon:77.5960 },
  { id:"SP-1028", name:"Tahiti Roy",       variant:"pro",  age:9,  battery:58, lastSeen:3,  storage:42, distress:64,  lat:12.9690, lon:77.5930 },
];

const POLICE_DB = [
  {"name": "Zone 1 Police Outpost",  "area": "HSR Layout", "contact": "+91-80-1000-0101", "lat": 12.9352, "lon": 77.6245},
  {"name": "Zone 2 Police Station",  "area": "Hebbal", "contact": "+91-80-1000-0102", "lat": 13.0210, "lon": 77.5800},
  {"name": "Zone 3 Police Station",  "area": "Whitefield", "contact": "+91-80-1000-0103", "lat": 12.9698, "lon": 77.7500},
  {"name": "Zone 4 Police Station",  "area": "Kengeri", "contact": "+91-80-1000-0104", "lat": 12.9750, "lon": 77.5300},
  {"name": "Zone 5 Police Outpost",  "area": "JP Nagar", "contact": "+91-80-1000-0105", "lat": 12.8990, "lon": 77.6010},
];

const getNearestPolice = (lat, lon) => {
  let minD = Infinity;
  let nearest = null;
  POLICE_DB.forEach(p => {
    const d = Math.sqrt(Math.pow(p.lat - lat, 2) + Math.pow(p.lon - lon, 2));
    if (d < minD) {
      minD = d;
      nearest = p;
    }
  });
  const distanceKm = (minD * 111).toFixed(2);
  return { ...nearest, distance: distanceKm };
};
const INITIAL_INCIDENTS = {
  "SP-1026": { type:"fall", status:"open", score:92, title:"fall", time:"9:41 AM" },
  "SP-1028": { type:"distress", status:"open", score:64, title:"distress", time:"9:38 AM" },
};
const LANGS = [
  {code:"en",label:"English",native:"English"},
  {code:"hi",label:"Hindi",native:"हिंदी"},
  {code:"kn",label:"Kannada",native:"ಕನ್ನಡ"},
  {code:"te",label:"Telugu",native:"తెలుగు"},
  {code:"bn",label:"Bengali",native:"বাংলা"},
  {code:"ta",label:"Tamil",native:"தமிழ்"},
];

// ─── TRANSLATIONS ───────────────────────────────────────────────────────────
const T = {
en:{
  brand:"SHAKTI-PIN",tagline:"Parent Safety Companion",
  home:"Home",track:"Track",actions:"Actions",guide:"Guide",
  statusSafe:"All good",statusAlert:"Keep watching",statusEmergency:"Emergency — act now",
  battery:"Battery",signal:"Signal",lastSeen:"Last seen",storage:"Storage",
  quickActions:"Quick actions",
  reqInfo:"Request Info",reqInfoDesc:"Get current location & status now",
  acknowledge:"Acknowledge",acknowledgeDesc:"Confirm you have seen this alert",
  reqAudio:"Request Audio",reqAudioDesc:"Ask device to record a 10-second clip",
  liveTrack:"Live Tracking",liveTrackDesc:"Follow location every 3 min for 30 minutes",
  proOnly:"Pro only",
  audioPrivacy:"Recording stays on device — you receive a brief summary only",
  trackTitle:"Live Location",trackStart:"Start 30-minute tracking",
  trackActive:"Tracking session active",trackDone:"Session complete",
  trackEmpty:"No session yet — start one above",
  locationHistory:"Location history",minAgo:"min ago",justNow:"Just now",
  guideTitle:"Help & Guide",forParents:"For Parents",forChild:"For Your Child",
  langTitle:"App Language",
  notifications:"Notifications",noNotifs:"No notifications yet",clearAll:"Clear all",
  selectChild:"Switch Child",switchHint:"Tap to view a different child's device",
  yearsOld:"years old",connected:"Connected",standby:"Standby",offline:"Offline",
  ackBtn:"Acknowledge Alert",escalateBtn:"Escalate to Help Centre",
  alertTitle_fall:"Fall Detected",alertTitle_sos:"SOS Pressed",alertTitle_distress:"High Distress",
  alertBody:"Shakti-Pin has flagged this as urgent. Review the details and acknowledge once you have seen it.",
  toastInfo:"Info request sent to device",toastAudio:"Audio request sent to device",
  toastTracking:"Live tracking started",toastAck:"Alert acknowledged",toastEscalated:"Escalated to help centre",
  guideP1:"The Home tab shows your child's status, battery and last known location — it updates automatically.",
  guideP2:"Acknowledge alerts as soon as they arrive so everyone knows you have seen them.",
  guideP3:"Use Request Info anytime. You do not need a reason — peace of mind is enough.",
  guideP4:"Request Audio (Pro): recordings never leave the device. You only receive a short status summary.",
  guideC1:"Wear your Shakti-Pin every day — clip it where you can reach easily.",
  guideC2:"Press and hold the button if you need help. It quietly alerts your parent right away.",
  guideC3:"It is okay that your parent checks in — that is how Shakti-Pin keeps you safe.",
  incidentOpen:"Open — please review",incidentAck:"Acknowledged",incidentEsc:"Escalated",
  deviceId:"Device ID",ageLabel:"Age",variantLabel:"Model",
  nearbyHelp:"Nearest help centre",nearbyPolice:"Nearest police station",
  pushTitle:"SHAKTI-PIN Alert",packetReceived:"Packet received • encrypted pipeline",
},
hi:{
  brand:"शक्ति-पिन",tagline:"अभिभावक सुरक्षा साथी",
  home:"होम",track:"ट्रैक",actions:"कार्य",guide:"गाइड",
  statusSafe:"सब ठीक है",statusAlert:"ध्यान रखें",statusEmergency:"आपातकाल — अभी कार्रवाई करें",
  battery:"बैटरी",signal:"सिग्नल",lastSeen:"अंतिम संपर्क",storage:"स्टोरेज",
  quickActions:"त्वरित कार्य",
  reqInfo:"जानकारी मांगें",reqInfoDesc:"अभी स्थान और स्थिति जानें",
  acknowledge:"स्वीकार करें",acknowledgeDesc:"पुष्टि करें कि आपने यह अलर्ट देखा",
  reqAudio:"ऑडियो मांगें",reqAudioDesc:"डिवाइस से 10 सेकंड क्लिप रिकॉर्ड करवाएं",
  liveTrack:"लाइव ट्रैकिंग",liveTrackDesc:"30 मिनट हर 3 मिनट में स्थान देखें",
  proOnly:"केवल प्रो",
  audioPrivacy:"रिकॉर्डिंग डिवाइस पर रहती है — आपको केवल सारांश मिलता है",
  trackTitle:"लाइव स्थान",trackStart:"30 मिनट ट्रैकिंग शुरू करें",
  trackActive:"ट्रैकिंग सत्र सक्रिय",trackDone:"सत्र पूरा हुआ",
  trackEmpty:"अभी कोई सत्र नहीं — ऊपर शुरू करें",
  locationHistory:"स्थान इतिहास",minAgo:"मिनट पहले",justNow:"अभी",
  guideTitle:"सहायता और गाइड",forParents:"अभिभावकों के लिए",forChild:"बच्चे के लिए",
  langTitle:"ऐप भाषा",
  notifications:"सूचनाएं",noNotifs:"अभी कोई सूचना नहीं",clearAll:"सभी हटाएं",
  selectChild:"बच्चा बदलें",switchHint:"दूसरे बच्चे का डिवाइस देखने के लिए टैप करें",
  yearsOld:"वर्ष",connected:"जुड़ा हुआ",standby:"प्रतीक्षारत",offline:"ऑफलाइन",
  ackBtn:"अलर्ट स्वीकार करें",escalateBtn:"सहायता केंद्र को सूचित करें",
  alertTitle_fall:"गिरने का पता चला",alertTitle_sos:"SOS दबाया",alertTitle_distress:"अत्यधिक चिंता",
  alertBody:"शक्ति-पिन ने इसे जरूरी माना है। देखने के बाद स्वीकार करें।",
  toastInfo:"जानकारी अनुरोध भेजा गया",toastAudio:"ऑडियो अनुरोध भेजा गया",
  toastTracking:"लाइव ट्रैकिंग शुरू हुई",toastAck:"अलर्ट स्वीकार किया गया",toastEscalated:"सहायता केंद्र को भेजा गया",
  guideP1:"होम टैब पर बच्चे की स्थिति, बैटरी और स्थान एक नज़र में देखें।",
  guideP2:"अलर्ट आते ही स्वीकार करें ताकि सबको पता चले कि आपने देख लिया।",
  guideP3:"कभी भी जानकारी मांगें — कारण जरूरी नहीं, मन की शांति पर्याप्त है।",
  guideP4:"ऑडियो (प्रो): रिकॉर्डिंग डिवाइस पर रहती है, आपको केवल सारांश मिलता है।",
  guideC1:"शक्ति-पिन रोज पहनें — जहां आसानी से पहुंच सकें वहां लगाएं।",
  guideC2:"मदद चाहिए तो बटन दबाकर रखें — यह चुपचाप आपके अभिभावक को बताएगा।",
  guideC3:"आपके अभिभावक का जांचना ठीक है — शक्ति-पिन इसी तरह सुरक्षित रखता है।",
  incidentOpen:"खुला — कृपया देखें",incidentAck:"स्वीकार किया",incidentEsc:"सूचित किया",
  deviceId:"डिवाइस ID",ageLabel:"आयु",variantLabel:"मॉडल",
  nearbyHelp:"निकटतम सहायता केंद्र",nearbyPolice:"निकटतम पुलिस स्टेशन",
  pushTitle:"शक्ति-पिन अलर्ट",packetReceived:"पैकेट प्राप्त • एन्क्रिप्टेड पाइपलाइन",
},
kn:{
  brand:"ಶಕ್ತಿ-ಪಿನ್",tagline:"ಪೋಷಕರ ಸುರಕ್ಷತಾ ಸಂಗಾತಿ",
  home:"ಮುಖಪುಟ",track:"ಟ್ರ್ಯಾಕ್",actions:"ಕ್ರಿಯೆಗಳು",guide:"ಮಾರ್ಗದರ್ಶಿ",
  statusSafe:"ಎಲ್ಲವೂ ಸುರಕ್ಷಿತ",statusAlert:"ಗಮನಿಸಿ",statusEmergency:"ತುರ್ತುಸ್ಥಿತಿ — ಈಗ ಕ್ರಮ ಕೈಗೊಳ್ಳಿ",
  battery:"ಬ್ಯಾಟರಿ",signal:"ಸಿಗ್ನಲ್",lastSeen:"ಕೊನೆಯ ಸಂಪರ್ಕ",storage:"ಸಂಗ್ರಹ",
  quickActions:"ತ್ವರಿತ ಕ್ರಿಯೆಗಳು",
  reqInfo:"ಮಾಹಿತಿ ಕೋರಿ",reqInfoDesc:"ಈಗ ಸ್ಥಳ ಮತ್ತು ಸ್ಥಿತಿ ಪಡೆಯಿರಿ",
  acknowledge:"ಸ್ವೀಕರಿಸಿ",acknowledgeDesc:"ಈ ಎಚ್ಚರಿಕೆ ನೋಡಿದ್ದೀರಿ ಎಂದು ದೃಢೀಕರಿಸಿ",
  reqAudio:"ಆಡಿಯೋ ಕೋರಿ",reqAudioDesc:"10 ಸೆ ಕ್ಲಿಪ್ ರೆಕಾರ್ಡ್ ಮಾಡಲು ಕೋರಿ",
  liveTrack:"ಲೈವ್ ಟ್ರ್ಯಾಕಿಂಗ್",liveTrackDesc:"30 ನಿಮಿಷ ಪ್ರತಿ 3 ನಿಮಿಷಕ್ಕೆ ಸ್ಥಳ",
  proOnly:"ಪ್ರೊ ಮಾತ್ರ",
  audioPrivacy:"ರೆಕಾರ್ಡಿಂಗ್ ಸಾಧನದಲ್ಲಿ ಉಳಿಯುತ್ತದೆ — ನಿಮಗೆ ಸಾರಾಂಶ ಮಾತ್ರ",
  trackTitle:"ಲೈವ್ ಸ್ಥಳ",trackStart:"30 ನಿಮಿಷ ಟ್ರ್ಯಾಕಿಂಗ್ ಪ್ರಾರಂಭಿಸಿ",
  trackActive:"ಟ್ರ್ಯಾಕಿಂಗ್ ಸಕ್ರಿಯ",trackDone:"ಅವಧಿ ಪೂರ್ಣ",
  trackEmpty:"ಇನ್ನೂ ಯಾವುದೇ ಅವಧಿ ಇಲ್ಲ",
  locationHistory:"ಸ್ಥಳ ಇತಿಹಾಸ",minAgo:"ನಿಮಿಷಗಳ ಹಿಂದೆ",justNow:"ಇದೀಗ",
  guideTitle:"ಸಹಾಯ ಮತ್ತು ಮಾರ್ಗದರ್ಶಿ",forParents:"ಪೋಷಕರಿಗಾಗಿ",forChild:"ಮಗುವಿಗಾಗಿ",
  langTitle:"ಅಪ್ಲಿಕೇಶನ್ ಭಾಷೆ",
  notifications:"ಅಧಿಸೂಚನೆಗಳು",noNotifs:"ಅಧಿಸೂಚನೆಗಳಿಲ್ಲ",clearAll:"ಎಲ್ಲ ತೆರವು",
  selectChild:"ಮಗುವನ್ನು ಬದಲಿಸಿ",switchHint:"ಬೇರೆ ಮಗುವಿನ ಸಾಧನ ನೋಡಲು ಟ್ಯಾಪ್ ಮಾಡಿ",
  yearsOld:"ವರ್ಷ",connected:"ಸಂಪರ್ಕಿತ",standby:"ಸ್ಟ್ಯಾಂಡ್‌ಬೈ",offline:"ಆಫ್‌ಲೈನ್",
  ackBtn:"ಎಚ್ಚರಿಕೆ ಸ್ವೀಕರಿಸಿ",escalateBtn:"ಸಹಾಯ ಕೇಂದ್ರ ತಿಳಿಸಿ",
  alertTitle_fall:"ಬೀಳುವಿಕೆ ಪತ್ತೆ",alertTitle_sos:"SOS ಒತ್ತಲಾಗಿದೆ",alertTitle_distress:"ಅಧಿಕ ಆತಂಕ",
  alertBody:"ಶಕ್ತಿ-ಪಿನ್ ಇದನ್ನು ತುರ್ತು ಎಂದು ಗುರುತಿಸಿದೆ. ನೋಡಿದ ನಂತರ ಸ್ವೀಕರಿಸಿ.",
  toastInfo:"ಮಾಹಿತಿ ವಿನಂತಿ ಕಳುಹಿಸಲಾಗಿದೆ",toastAudio:"ಆಡಿಯೋ ವಿನಂತಿ ಕಳುಹಿಸಲಾಗಿದೆ",
  toastTracking:"ಲೈವ್ ಟ್ರ್ಯಾಕಿಂಗ್ ಪ್ರಾರಂಭ",toastAck:"ಎಚ್ಚರಿಕೆ ಸ್ವೀಕರಿಸಲಾಗಿದೆ",toastEscalated:"ಸಹಾಯ ಕೇಂದ್ರಕ್ಕೆ ಕಳುಹಿಸಲಾಗಿದೆ",
  guideP1:"ಹೋಮ್ ಟ್ಯಾಬ್‌ನಲ್ಲಿ ಮಗುವಿನ ಸ್ಥಿತಿ, ಬ್ಯಾಟರಿ, ಸ್ಥಳ ನೋಡಿ.",
  guideP2:"ಎಚ್ಚರಿಕೆಗಳು ಬಂದಾಗ ತಕ್ಷಣ ಸ್ವೀಕರಿಸಿ.",
  guideP3:"ಯಾವಾಗಲಾದರೂ ಮಾಹಿತಿ ಕೋರಿ — ಕಾರಣ ಬೇಕಿಲ್ಲ.",
  guideP4:"ಆಡಿಯೋ (ಪ್ರೊ): ರೆಕಾರ್ಡಿಂಗ್ ಸಾಧನದಲ್ಲಿ ಉಳಿಯುತ್ತದೆ, ಸಾರಾಂಶ ಮಾತ್ರ.",
  guideC1:"ಪ್ರತಿದಿನ ಶಕ್ತಿ-ಪಿನ್ ಧರಿಸಿ — ಸಹಜ ತಲುಪಬಹುದಾದ ಸ್ಥಳದಲ್ಲಿ.",
  guideC2:"ಸಹಾಯ ಬೇಕಾದರೆ ಬಟನ್ ಒತ್ತಿ ಹಿಡಿಯಿರಿ.",
  guideC3:"ಪೋಷಕರ ಪರಿಶೀಲನೆ ಸರಿ — ಇದೇ ರಕ್ಷಣೆಯ ವಿಧಾನ.",
  incidentOpen:"ತೆರೆದಿದೆ — ನೋಡಿ",incidentAck:"ಸ್ವೀಕರಿಸಲಾಗಿದೆ",incidentEsc:"ಕಳುಹಿಸಲಾಗಿದೆ",
  deviceId:"ಸಾಧನ ID",ageLabel:"ವಯಸ್ಸು",variantLabel:"ಮಾದರಿ",
  nearbyHelp:"ಸಮೀಪ ಸಹಾಯ ಕೇಂದ್ರ",nearbyPolice:"ಸಮೀಪ ಪೊಲೀಸ್",
  pushTitle:"ಶಕ್ತಿಪಿನ್ ಎಚ್ಚರಿಕೆ",packetReceived:"ಪ್ಯಾಕೆಟ್ ಸ್ವೀಕರಿಸಲಾಗಿದೆ",
},
te:{
  brand:"శక్తి-పిన్",tagline:"తల్లిదండ్రుల భద్రతా సహచరుడు",
  home:"హోమ్",track:"ట్రాక్",actions:"చర్యలు",guide:"గైడ్",
  statusSafe:"అంతా బాగుంది",statusAlert:"గమనించండి",statusEmergency:"అత్యవసరం — ఇప్పుడు చర్య తీసుకోండి",
  battery:"బ్యాటరీ",signal:"సిగ్నల్",lastSeen:"చివరి సంబంధం",storage:"నిల్వ",
  quickActions:"త్వరిత చర్యలు",
  reqInfo:"సమాచారం అడగండి",reqInfoDesc:"ఇప్పుడే స్థానం & స్థితి పొందండి",
  acknowledge:"అంగీకరించండి",acknowledgeDesc:"హెచ్చరిక చూశారని నిర్ధారించండి",
  reqAudio:"ఆడియో అడగండి",reqAudioDesc:"10 సె క్లిప్ రికార్డ్ చేయమని కోరండి",
  liveTrack:"లైవ్ ట్రాకింగ్",liveTrackDesc:"30 నిమిషాలు ప్రతి 3 నిమి స్థానం",
  proOnly:"ప్రో మాత్రమే",
  audioPrivacy:"రికార్డింగ్ పరికరంలో ఉంటుంది — సారాంశం మాత్రమే వస్తుంది",
  trackTitle:"లైవ్ స్థానం",trackStart:"30 నిమి ట్రాకింగ్ ప్రారంభించండి",
  trackActive:"ట్రాకింగ్ సక్రియం",trackDone:"సెషన్ పూర్తి",
  trackEmpty:"సెషన్ లేదు — పైన ప్రారంభించండి",
  locationHistory:"స్థాన చరిత్ర",minAgo:"నిమిషాల క్రితం",justNow:"ఇప్పుడే",
  guideTitle:"సహాయం & గైడ్",forParents:"తల్లిదండ్రుల కోసం",forChild:"మీ పిల్లల కోసం",
  langTitle:"యాప్ భాష",
  notifications:"నోటిఫికేషన్‌లు",noNotifs:"నోటిఫికేషన్‌లు లేవు",clearAll:"అన్నీ తీసివేయి",
  selectChild:"పిల్లవాడిని మార్చండి",switchHint:"మరో పరికరం చూడటానికి నొక్కండి",
  yearsOld:"సంవత్సరాలు",connected:"కనెక్ట్ అయింది",standby:"స్టాండ్‌బై",offline:"ఆఫ్‌లైన్",
  ackBtn:"హెచ్చరికను అంగీకరించండి",escalateBtn:"సహాయ కేంద్రాన్ని సంప్రదించండి",
  alertTitle_fall:"పడిపోవడం గుర్తించబడింది",alertTitle_sos:"SOS నొక్కబడింది",alertTitle_distress:"అధిక ఆందోళన",
  alertBody:"శక్తి-పిన్ దీన్ని అత్యవసరంగా గుర్తించింది. చూసిన తర్వాత అంగీకరించండి.",
  toastInfo:"సమాచారం అభ్యర్థన పంపబడింది",toastAudio:"ఆడియో అభ్యర్థన పంపబడింది",
  toastTracking:"లైవ్ ట్రాకింగ్ ప్రారంభమైంది",toastAck:"హెచ్చరిక అంగీకరించబడింది",toastEscalated:"సహాయ కేంద్రానికి పంపబడింది",
  guideP1:"హోమ్ టాబ్‌లో స్థితి, బ్యాటరీ, స్థానం ఒకే చూపులో చూడండి.",
  guideP2:"హెచ్చరికలు వచ్చినప్పుడు వెంటనే అంగీకరించండి.",
  guideP3:"ఎప్పుడైనా సమాచారం అడగండి — కారణం అవసరం లేదు.",
  guideP4:"ఆడియో (ప్రో): రికార్డింగ్ పరికరంలో ఉంటుంది, సారాంశం మాత్రమే వస్తుంది.",
  guideC1:"ప్రతిరోజూ శక్తి-పిన్ ధరించండి — సులభంగా చేరుకోగల చోట.",
  guideC2:"సహాయం అవసరమైతే బటన్ నొక్కి పట్టుకోండి.",
  guideC3:"తల్లిదండ్రులు తనిఖీ చేయడం సరైనదే — శక్తి-పిన్ పాలన ఇదే.",
  incidentOpen:"తెరవబడింది — సమీక్షించండి",incidentAck:"అంగీకరించబడింది",incidentEsc:"పంపబడింది",
  deviceId:"పరికరం ID",ageLabel:"వయసు",variantLabel:"మోడల్",
  nearbyHelp:"సమీప సహాయ కేంద్రం",nearbyPolice:"సమీప పోలీస్",
  pushTitle:"శక్తిపిన్ హెచ్చరిక",packetReceived:"పాకెట్ అందింది",
},
bn:{
  brand:"শক্তি-পিন",tagline:"অভিভাবক সুরক্ষা সহচর",
  home:"হোম",track:"ট্র্যাক",actions:"কার্যক্রম",guide:"গাইড",
  statusSafe:"সব ঠিক আছে",statusAlert:"নজর রাখুন",statusEmergency:"জরুরি — এখনই ব্যবস্থা নিন",
  battery:"ব্যাটারি",signal:"সিগন্যাল",lastSeen:"শেষ যোগাযোগ",storage:"স্টোরেজ",
  quickActions:"দ্রুত কার্যক্রম",
  reqInfo:"তথ্য চান",reqInfoDesc:"এখনই অবস্থান ও অবস্থা জানুন",
  acknowledge:"স্বীকার করুন",acknowledgeDesc:"এই সতর্কতা দেখেছেন তা নিশ্চিত করুন",
  reqAudio:"অডিও চান",reqAudioDesc:"১০ সে ক্লিপ রেকর্ড করতে বলুন",
  liveTrack:"লাইভ ট্র্যাকিং",liveTrackDesc:"৩০ মিনিট প্রতি ৩ মিনিটে অবস্থান",
  proOnly:"শুধু প্রো",
  audioPrivacy:"রেকর্ডিং ডিভাইসেই থাকে — আপনি সারসংক্ষেপ পান",
  trackTitle:"লাইভ অবস্থান",trackStart:"৩০ মিনিটের ট্র্যাকিং শুরু করুন",
  trackActive:"ট্র্যাকিং সক্রিয়",trackDone:"সেশন সম্পন্ন",
  trackEmpty:"এখনও কোনো সেশন নেই",
  locationHistory:"অবস্থানের ইতিহাস",minAgo:"মিনিট আগে",justNow:"এইমাত্র",
  guideTitle:"সাহায্য ও গাইড",forParents:"অভিভাবকদের জন্য",forChild:"আপনার সন্তানের জন্য",
  langTitle:"অ্যাপের ভাষা",
  notifications:"বিজ্ঞপ্তি",noNotifs:"এখনও কোনো বিজ্ঞপ্তি নেই",clearAll:"সব মুছুন",
  selectChild:"শিশু পরিবর্তন করুন",switchHint:"অন্য শিশুর ডিভাইস দেখতে ট্যাপ করুন",
  yearsOld:"বছর",connected:"সংযুক্ত",standby:"স্ট্যান্ডবাই",offline:"অফলাইন",
  ackBtn:"সতর্কতা স্বীকার করুন",escalateBtn:"সাহায্য কেন্দ্রে যোগাযোগ করুন",
  alertTitle_fall:"পড়ে যাওয়া শনাক্ত",alertTitle_sos:"SOS চাপা হয়েছে",alertTitle_distress:"উচ্চ উদ্বেগ",
  alertBody:"শক্তি-পিন এটিকে জরুরি বলে চিহ্নিত করেছে। দেখার পর স্বীকার করুন।",
  toastInfo:"তথ্য অনুরোধ পাঠানো হয়েছে",toastAudio:"অডিও অনুরোধ পাঠানো হয়েছে",
  toastTracking:"লাইভ ট্র্যাকিং শুরু হয়েছে",toastAck:"সতর্কতা স্বীকার করা হয়েছে",toastEscalated:"সাহায্য কেন্দ্রে পাঠানো হয়েছে",
  guideP1:"হোম ট্যাবে শিশুর অবস্থা, ব্যাটারি, অবস্থান একনজরে দেখুন।",
  guideP2:"সতর্কতা আসার সাথে সাথে স্বীকার করুন।",
  guideP3:"যেকোনো সময় তথ্য চান — কারণের দরকার নেই।",
  guideP4:"অডিও (প্রো): রেকর্ডিং ডিভাইসে থাকে, সারসংক্ষেপ পান।",
  guideC1:"প্রতিদিন শক্তি-পিন পরুন — সহজে পৌঁছানো যায় এমন জায়গায়।",
  guideC2:"সাহায্য দরকার হলে বাটন চেপে ধরুন।",
  guideC3:"অভিভাবকের চেক করা ঠিক আছে — শক্তি-পিন এভাবেই সুরক্ষিত রাখে।",
  incidentOpen:"খোলা আছে — দেখুন",incidentAck:"স্বীকার করা হয়েছে",incidentEsc:"পাঠানো হয়েছে",
  deviceId:"ডিভাইস ID",ageLabel:"বয়স",variantLabel:"মডেল",
  nearbyHelp:"নিকটবর্তী সাহায্য কেন্দ্র",nearbyPolice:"নিকটবর্তী পুলিশ",
  pushTitle:"শক্তি-পিন সতর্কতা",packetReceived:"প্যাকেট পাওয়া গেছে",
},
ta:{
  brand:"சக்தி-பின்",tagline:"பெற்றோர் பாதுகாப்பு துணை",
  home:"முகப்பு",track:"கண்காணி",actions:"செயல்கள்",guide:"வழிகாட்டி",
  statusSafe:"எல்லாம் நலம்",statusAlert:"கவனிக்கவும்",statusEmergency:"அவசரநிலை — இப்போதே செயல்படவும்",
  battery:"மின்கலம்",signal:"சிக்னல்",lastSeen:"கடைசி தொடர்பு",storage:"சேமிப்பு",
  quickActions:"விரைவு செயல்கள்",
  reqInfo:"தகவல் கேளுங்கள்",reqInfoDesc:"இப்போதே இருப்பிடம் & நிலை பெறவும்",
  acknowledge:"ஒப்புக்கொள்ளுங்கள்",acknowledgeDesc:"எச்சரிக்கை பார்த்தீர்கள் என உறுதிசெய்யவும்",
  reqAudio:"ஒலி கேளுங்கள்",reqAudioDesc:"10 நிமிட ஒலி பதிவு கோரவும்",
  liveTrack:"நேரடி கண்காணிப்பு",liveTrackDesc:"30 நிமிடம் ஒவ்வொரு 3 நிமிடத்திற்கும்",
  proOnly:"Pro மட்டும்",
  audioPrivacy:"பதிவு சாதனத்திலேயே இருக்கும் — சுருக்கம் மட்டும் வரும்",
  trackTitle:"நேரடி இருப்பிடம்",trackStart:"30 நிமிட கண்காணிப்பு தொடங்கு",
  trackActive:"கண்காணிப்பு சக்தியில்",trackDone:"அமர்வு முடிந்தது",
  trackEmpty:"இன்னும் அமர்வு இல்லை",
  locationHistory:"இருப்பிட வரலாறு",minAgo:"நிமிடங்களுக்கு முன்",justNow:"இப்போதுதான்",
  guideTitle:"உதவி & வழிகாட்டி",forParents:"பெற்றோர்களுக்கு",forChild:"உங்கள் குழந்தைக்கு",
  langTitle:"செயலி மொழி",
  notifications:"அறிவிப்புகள்",noNotifs:"இன்னும் அறிவிப்புகள் இல்லை",clearAll:"அனைத்தும் அழி",
  selectChild:"குழந்தையை மாற்று",switchHint:"வேறு குழந்தையின் சாதனத்தைப் பார்க்க தட்டவும்",
  yearsOld:"வயது",connected:"இணைக்கப்பட்டது",standby:"காத்திருப்பு",offline:"ஆஃப்லைன்",
  ackBtn:"எச்சரிக்கையை ஒப்புக்கொள்",escalateBtn:"உதவி மையத்தை தொடர்புகொள்",
  alertTitle_fall:"விழுதல் கண்டறியப்பட்டது",alertTitle_sos:"SOS அழுத்தப்பட்டது",alertTitle_distress:"அதிக கவலை",
  alertBody:"சக்தி-பின் இதை அவசரமானது என குறித்தது. பார்த்த பின் ஒப்புக்கொள்ளவும்.",
  toastInfo:"தகவல் கோரிக்கை அனுப்பப்பட்டது",toastAudio:"ஒலி கோரிக்கை அனுப்பப்பட்டது",
  toastTracking:"நேரடி கண்காணிப்பு தொடங்கியது",toastAck:"எச்சரிக்கை ஒப்புக்கொள்ளப்பட்டது",toastEscalated:"உதவி மையத்திற்கு அனுப்பப்பட்டது",
  guideP1:"ஹோம் தாவலில் நிலை, மின்கலம், இருப்பிடம் ஒரே பார்வையில் பாருங்கள்.",
  guideP2:"எச்சரிக்கைகள் வந்தவுடன் ஒப்புக்கொள்ளுங்கள்.",
  guideP3:"எப்போது வேண்டுமானாலும் தகவல் கேளுங்கள் — காரணம் தேவையில்லை.",
  guideP4:"ஒலி (Pro): பதிவு சாதனத்திலேயே இருக்கும், சுருக்கம் மட்டும் வரும்.",
  guideC1:"தினமும் சக்தி-பின் அணியுங்கள் — எளிதாக அடையும் இடத்தில்.",
  guideC2:"உதவி தேவையானால் பொத்தானை அழுத்திப் பிடிக்கவும்.",
  guideC3:"பெற்றோர் சரிபார்ப்பது சரிதான் — சக்தி-பின் பாதுகாப்பு இதுதான்.",
  incidentOpen:"திறந்துள்ளது — பாருங்கள்",incidentAck:"ஒப்புக்கொள்ளப்பட்டது",incidentEsc:"அனுப்பப்பட்டது",
  deviceId:"சாதனம் ID",ageLabel:"வயது",variantLabel:"மாதிரி",
  nearbyHelp:"அருகிலுள்ள உதவி மையம்",nearbyPolice:"அருகிலுள்ள காவல்",
  pushTitle:"சக்தி-பின் எச்சரிக்கை",packetReceived:"பாக்கெட் கிடைத்தது",
},
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const initials = name => name.split(" ").map(p=>p[0]).slice(0,2).join("").toUpperCase();
const statusKey = (incident) => {
  if (!incident || incident.status==="acknowledged") return "safe";
  if (incident.score >= 70) return "emergency";
  if (incident.score >= 40) return "alert";
  return "safe";
};
const COLORS = {
  violet:"#5B3A8E", violetDeep:"#3E2766", violetSoft:"#EFE6F9",
  saffron:"#FF8A3D", saffronSoft:"#FFE7D2",
  leaf:"#2E8B57", leafSoft:"#DEF2E6",
  amber:"#C97A06", amberSoft:"#FBEBC9",
  red:"#D7263D", redSoft:"#FBDADD",
  sand:"#FBF6EE", card:"#FFFFFF", line:"#ECE3D5",
  inkHi:"#211C2E", inkSoft:"#6A6379",
};
const statusColors = {
  safe:{main:COLORS.leaf,soft:COLORS.leafSoft},
  alert:{main:COLORS.amber,soft:COLORS.amberSoft},
  emergency:{main:COLORS.red,soft:COLORS.redSoft},
};
const fmtLastSeen = (min,t_fn) => min<=0 ? t_fn("justNow") : `${min} ${t_fn("minAgo")}`;
const radioLabel = (min,t_fn) => min<=10 ? t_fn("connected") : (min<=90 ? t_fn("standby") : t_fn("offline"));
const randGPS = (base,spread=0.008) => ({lat:base.lat+(Math.random()-0.5)*spread, lon:base.lon+(Math.random()-0.5)*spread});
const latLonToXY = (lat,lon,w=260,h=180) => {
  const [minLat,maxLat,minLon,maxLon]=[12.940,13.005,77.555,77.640];
  return {x:((lon-minLon)/(maxLon-minLon))*w, y:((maxLat-lat)/(maxLat-minLat))*h};
};

// ─── ICONS ───────────────────────────────────────────────────────────────────
const Ic = {
  home: <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5a1 1 0 0 0 1 1H9.5v-6h5v6H17.5a1 1 0 0 0 1-1V10"/></svg>,
  track: <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-6.4 7-12a7 7 0 1 0-14 0c0 5.6 7 12 7 12Z"/><circle cx="12" cy="9" r="2.3"/></svg>,
  actions: <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12.5 2 4 14h6l-1 8 8.5-12h-6z"/></svg>,
  guide: <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5.2C4 4 5 3.2 6.2 3.4 8 3.7 10 4.5 12 5.8 14 4.5 16 3.7 17.8 3.4 19 3.2 20 4 20 5.2v13c0 1.2-1 2-2.2 1.8-1.8-.3-3.8-1.1-5.8-2.4-2 1.3-4 2.1-5.8 2.4C5 20.2 4 19.4 4 18.2Z"/><path d="M12 5.8v13"/></svg>,
  bell: <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9a6 6 0 1 1 12 0c0 3.2 1 4.6 2 6H4c1-1.4 2-2.8 2-6Z"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>,
  globe: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 4 6 4 9s-1.4 6.4-4 9c-2.6-2.6-4-6-4-9s1.4-6.4 4-9Z"/></svg>,
  chevDown: <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>,
  close: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 5l14 14M19 5 5 19"/></svg>,
  check: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5 9.5 17 19 7"/></svg>,
  info: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v.01M12 11v5"/></svg>,
  mic: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>,
  pin: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-6.4 7-12a7 7 0 1 0-14 0c0 5.6 7 12 7 12Z"/><circle cx="12" cy="9" r="2.3"/></svg>,
  shield: <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4 7v5c0 4.4 3.4 8.5 8 9.5 4.6-1 8-5.1 8-9.5V7z"/></svg>,
  lock: <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 1 1 8 0v4"/></svg>,
  volume: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>,
};

// ─── STATUS RING ──────────────────────────────────────────────────────────────
function StatusRing({name, sk, size=56, pulse=false}) {
  const sc = statusColors[sk] || statusColors.safe;
  const r = size/2-4; const cx=size/2;
  return (
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}
        style={pulse?{animation:"pulseRing 2s infinite"}:{}}>
        <circle cx={cx} cy={cx} r={r} fill="#fff" stroke={sc.soft} strokeWidth="3"/>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={sc.main} strokeWidth="3.5"
          strokeLinecap="round" transform={`rotate(-90 ${cx} ${cx})`}
          strokeDasharray={sk==="emergency"?"6 4":""}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",
        justifyContent:"center",fontFamily:"'Sora',sans-serif",fontWeight:800,
        fontSize:size*0.23,color:COLORS.violetDeep}}>{initials(name)}</div>
    </div>
  );
}

// ─── PUSH BANNER ──────────────────────────────────────────────────────────────
function PushBanner({push, onDismiss}) {
  if(!push) return null;
  return (
    <div style={{
      position:"absolute",top:38,left:10,right:10,zIndex:80,
      background:"rgba(20,14,32,0.96)",backdropFilter:"blur(12px)",
      borderRadius:16,padding:"12px 14px",display:"flex",flexDirection:"column",gap:8,
      boxShadow:"0 14px 36px rgba(0,0,0,0.45)",cursor:"default",
      animation:"slideDown .38s cubic-bezier(.2,.9,.25,1)",
      border: `1px solid ${push.urgent ? COLORS.red : COLORS.violet}`,
    }}>
      <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
        <div style={{width:30,height:30,borderRadius:9,flexShrink:0,
          background:push.urgent?COLORS.red:COLORS.violet,
          display:"flex",alignItems:"center",justifyContent:"center",color:"#fff"}}>
          {push.urgent ? "🚨" : "🔔"}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{color:"#fff",fontWeight:700,fontSize:13}}>{push.title}</span>
            <span style={{color:"rgba(255,255,255,.55)",fontSize:10.5}}>now</span>
          </div>
          <div style={{color:"rgba(255,255,255,.88)",fontSize:12,marginTop:2,lineHeight:1.35}}>{push.body}</div>
        </div>
        <button onClick={onDismiss} style={{border:"none",background:"transparent",color:"rgba(255,255,255,0.5)",cursor:"pointer",padding:2}}>{Ic.close}</button>
      </div>

      {push.mapsUrl && (
        <div style={{paddingTop:4,borderTop:"1px solid rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <a href={push.mapsUrl} target="_blank" rel="noopener noreferrer" onClick={(e)=>e.stopPropagation()} style={{color:"#aa3bff",textDecoration:"none",fontWeight:"bold",fontSize:11.5,display:"inline-flex",alignItems:"center",gap:4}}>
            <span>📍</span> Google Maps Location
          </a>
        </div>
      )}

      {push.params && (
        <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:2}}>
          {Object.entries(push.params).map(([key, val]) => (
            <div key={key} style={{fontSize:9.5,background:"rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.85)",padding:"2px 6px",borderRadius:6,border:"1px solid rgba(255,255,255,0.05)"}}>
              <strong>{key}:</strong> {val}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── APP BAR ──────────────────────────────────────────────────────────────────
function AppBar({child, lang, t, unread, onLang, onNotif, onChildPick, sk}) {
  const sc = statusColors[sk]||statusColors.safe;
  const statusLabel = {safe:t("statusSafe"),alert:t("statusAlert"),emergency:t("statusEmergency")}[sk];
  return (
    <div style={{padding:"8px 16px 10px",flexShrink:0}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <svg width="24" height="24" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill={COLORS.violetSoft}/>
            <path d="M12 5v14M7 8.5l5-3.5 5 3.5M7 15.5l5 3.5 5-3.5" stroke={COLORS.violet} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{fontFamily:"'Sora',sans-serif",fontWeight:800,fontSize:15,color:COLORS.violetDeep,letterSpacing:.2}}>{t("brand")}</span>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <button onClick={onLang} style={{border:`1px solid ${COLORS.line}`,background:COLORS.card,borderRadius:11,padding:"0 8px",height:34,fontSize:12,fontWeight:700,color:COLORS.violetDeep,display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}>
            {Ic.globe}<span>{lang.toUpperCase()}</span>
          </button>
          <button onClick={onNotif} style={{width:34,height:34,borderRadius:11,border:`1px solid ${COLORS.line}`,background:COLORS.card,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",position:"relative",color:COLORS.inkHi}}>
            {Ic.bell}
            {unread>0 && <span style={{position:"absolute",top:-3,right:-3,minWidth:15,height:15,borderRadius:8,background:COLORS.red,color:"#fff",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px"}}>{unread}</span>}
          </button>
        </div>
      </div>
      <div onClick={onChildPick} style={{marginTop:10,display:"flex",alignItems:"center",gap:10,background:COLORS.card,border:`1px solid ${COLORS.line}`,borderRadius:16,padding:"8px 10px",cursor:"pointer"}}>
        <StatusRing name={child.name} sk={sk} size={44} pulse={sk==="emergency"}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:14,lineHeight:1.2,color:COLORS.inkHi}}>{child.name}</div>
          <div style={{fontSize:11.5,color:COLORS.inkSoft,marginTop:1}}>{child.id} · {child.variant==="pro"?"Shaktipin Pro":"Shaktipin"}</div>
        </div>
        <div style={{fontSize:11,fontWeight:700,padding:"4px 9px",borderRadius:20,background:sc.soft,color:sc.main,flexShrink:0}}>{statusLabel}</div>
        <span style={{color:COLORS.inkSoft}}>{Ic.chevDown}</span>
      </div>
    </div>
  );
}

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────
function MiniBar({pct,color}) {
  return (
    <div style={{width:90,height:5,background:COLORS.line,borderRadius:3,overflow:"hidden",flexShrink:0}}>
      <div style={{width:`${pct}%`,height:"100%",background:color,borderRadius:3}}/>
    </div>
  );
}

// ─── HOME TAB ─────────────────────────────────────────────────────────────────
function HomeTab({child, t, incidents, onAck, onEscalate, sk, onSelectChild, onBuzzDevice}) {
  const incident = incidents[child.id];
  const sc = statusColors[sk]||statusColors.safe;
  const battColor = child.battery>50?COLORS.leaf:(child.battery>20?COLORS.amber:COLORS.red);
  const storColor = child.storage<70?COLORS.leaf:(child.storage<90?COLORS.amber:COLORS.red);
  const sigColor = child.lastSeen<=5?COLORS.leaf:(child.lastSeen<=30?COLORS.amber:COLORS.red);

  return (
    <div style={{padding:"4px 16px 0"}}>
      {/* Incident Alert */}
      {incident && incident.status==="open" && (
        <div style={{borderRadius:18,padding:14,marginBottom:14,border:`1.5px solid ${COLORS.red}`,background:`linear-gradient(135deg, rgba(215,38,61,.06), rgba(215,38,61,.13))`,animation:"pulseAlert 2.5s infinite"}}>
          <div style={{display:"flex",alignItems:"center",gap:7,fontWeight:700,fontSize:13.5,color:COLORS.red,marginBottom:5}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:COLORS.red,boxShadow:`0 0 8px ${COLORS.red}`}}/>
            {incident.type==="fall"?t("alertTitle_fall"):incident.type==="sos"?t("alertTitle_sos"):t("alertTitle_distress")}
          </div>
          <div style={{fontSize:12.5,lineHeight:1.5,color:COLORS.inkHi,marginBottom:10}}>{t("alertBody")}</div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>onAck(child.id)} style={{flex:1,border:`1.5px solid ${COLORS.violet}`,background:COLORS.card,borderRadius:12,padding:"9px 0",fontWeight:700,fontSize:12.5,color:COLORS.violetDeep,cursor:"pointer"}}>{t("ackBtn")}</button>
            <button onClick={()=>onEscalate(child.id)} style={{flex:1,border:"none",background:COLORS.red,borderRadius:12,padding:"9px 0",fontWeight:700,fontSize:12.5,color:"#fff",cursor:"pointer"}}>{t("escalateBtn")}</button>
          </div>
          <div style={{display:"flex",gap:8,marginTop:8}}>
            <button onClick={onBuzzDevice} style={{flex:1,border:"none",background:COLORS.saffron,borderRadius:12,padding:"9px 0",fontWeight:700,fontSize:12.5,color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              <span>🔊</span> Trigger Piezo Buzzer
            </button>
          </div>
        </div>
      )}
      {incident && incident.status==="acknowledged" && (
        <div style={{borderRadius:14,padding:"10px 14px",marginBottom:12,border:`1px solid ${COLORS.amber}`,background:COLORS.amberSoft,display:"flex",alignItems:"center",gap:8,fontSize:12.5,color:COLORS.amber,fontWeight:600}}>
          <span>✓</span>{t("incidentAck")}
        </div>
      )}

      {/* Status hero */}
      <div style={{background:`linear-gradient(160deg,#fff,${COLORS.violetSoft})`,border:`1px solid ${COLORS.line}`,borderRadius:22,padding:"18px 16px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:6,marginBottom:12}}>
        <StatusRing name={child.name} sk={sk} size={82} pulse={sk==="emergency"}/>
        <div style={{fontWeight:700,fontSize:16,marginTop:4,color:COLORS.inkHi}}>{child.name}</div>
        <div style={{fontSize:12,color:COLORS.inkSoft}}>{child.age} {t("yearsOld")} · {child.id}</div>
        <div style={{fontSize:12.5,fontWeight:700,padding:"5px 14px",borderRadius:20,background:sc.soft,color:sc.main,marginTop:2,display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:sc.main}}/>{radioLabel(child.lastSeen,t)} · {fmtLastSeen(child.lastSeen,t)}
        </div>
      </div>

      {/* Stats chips */}
      <div style={{display:"flex",gap:8,marginBottom:12,overflowX:"auto",paddingBottom:2}}>
        {[
          {lbl:t("battery"),val:`${child.battery}%`,pct:child.battery,color:battColor},
          {lbl:t("signal"),val:fmtLastSeen(child.lastSeen,t),pct:Math.max(5,100-child.lastSeen*5),color:sigColor},
          {lbl:t("storage"),val:`${child.storage}%`,pct:child.storage,color:storColor},
        ].map(chip=>(
          <div key={chip.lbl} style={{flex:"0 0 auto",minWidth:90,background:COLORS.card,border:`1px solid ${COLORS.line}`,borderRadius:14,padding:"9px 11px"}}>
            <div style={{fontSize:10,color:COLORS.inkSoft,fontWeight:600,marginBottom:3}}>{chip.lbl}</div>
            <div style={{fontWeight:700,fontSize:14,color:COLORS.inkHi}}>{chip.val}</div>
            <MiniBar pct={chip.pct} color={chip.color}/>
          </div>
        ))}
      </div>

      {/* Nearest Police Station Card */}
      {(() => {
        const police = getNearestPolice(child.lat, child.lon);
        return (
          <div style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.line}`,
            borderRadius: 18,
            padding: "12px 14px",
            marginBottom: 14,
            fontSize: 12,
            color: COLORS.inkHi,
            display: "flex",
            flexDirection: "column",
            gap: 4
          }}>
            <div style={{fontWeight: 700, display: "flex", alignItems: "center", gap: 5, color: COLORS.violetDeep, fontSize: 13, borderBottom: `1px solid ${COLORS.line}`, paddingBottom: 6, marginBottom: 4}}>
              <span>👮</span> {t("nearbyPolice")}
            </div>
            <div style={{fontWeight: 700, fontSize: 13.5, color: COLORS.inkHi}}>{police.name}</div>
            <div style={{display: "flex", justifyContent: "space-between", color: COLORS.inkSoft, marginTop: 2}}>
              <span>📍 Area: <strong style={{color: COLORS.inkHi}}>{police.area}</strong></span>
              <span>🚗 Distance: <strong style={{color: COLORS.inkHi}}>{police.distance} km</strong></span>
            </div>
            <div style={{color: COLORS.inkSoft, marginTop: 2}}>
              📞 Contact: <strong style={{color: COLORS.inkHi}}>{police.contact}</strong>
            </div>
          </div>
        );
      })()}

      {/* All children overview */}
      <div style={{fontSize:12.5,fontWeight:700,textTransform:"uppercase",letterSpacing:.6,color:COLORS.inkSoft,marginBottom:8}}>{t("selectChild")}</div>
      <div style={{display:"flex",flexDirection:"column",gap:0}}>
        {CHILDREN_DATA.map(c=>{
          const csk = statusKey(incidents[c.id]);
          const csc = statusColors[csk];
          return (
            <div key={c.id} onClick={() => onSelectChild(c.id)} style={{
              display:"flex",
              alignItems:"center",
              gap:10,
              padding:"9px 8px",
              borderBottom:`1px solid ${COLORS.line}`,
              cursor:"pointer",
              background: child.id === c.id ? COLORS.violetSoft : "transparent",
              borderRadius: 8,
              transition: "background 0.2s ease"
            }}>
              <StatusRing name={c.name} sk={csk} size={34}/>
              <div style={{flex:1,fontSize:12.5,fontWeight:600,color:COLORS.inkHi}}>{c.name}</div>
              <div style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:12,background:csc.soft,color:csc.main}}>{c.battery}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── TRACK TAB ────────────────────────────────────────────────────────────────
function TrackTab({child, t, trackingData, isTracking, onStart}) {
  const pts = trackingData[child.id]||[];
  const showMap = pts.length>0;
  const mapW=268, mapH=180;

  return (
    <div style={{padding:"4px 16px 0"}}>
      <div style={{fontSize:12.5,fontWeight:700,textTransform:"uppercase",letterSpacing:.6,color:COLORS.inkSoft,marginBottom:8}}>{t("trackTitle")}</div>

      {/* Map */}
      <div style={{borderRadius:18,overflow:"hidden",border:`1px solid ${COLORS.line}`,background:"#F0E8D5",height:200,position:"relative",marginBottom:12}}>
        <svg width="100%" height="200" viewBox={`0 0 ${mapW} ${mapH}`} style={{position:"absolute",inset:0}}>
          {/* Simplified Bengaluru roads */}
          <rect width={mapW} height={mapH} fill="#F3ECDD"/>
          {[[[40,90],[228,90]],[[134,10],[134,170]],[[40,140],[228,50]],[[60,30],[200,150]]].map((road,i)=>(
            <line key={i} x1={road[0][0]} y1={road[0][1]} x2={road[1][0]} y2={road[1][1]} stroke="#E5D6B8" strokeWidth="8" strokeLinecap="round"/>
          ))}
          {[[[40,90],[228,90]],[[134,10],[134,170]]].map((road,i)=>(
            <line key={`m${i}`} x1={road[0][0]} y1={road[0][1]} x2={road[1][0]} y2={road[1][1]} stroke="#D9C9A8" strokeWidth="3" strokeLinecap="round"/>
          ))}
          {showMap && (() => {
            const mapped = pts.map(p=>latLonToXY(p.lat,p.lon,mapW,mapH));
            return <>
              <polyline points={mapped.map(p=>`${p.x},${p.y}`).join(" ")} fill="none" stroke={COLORS.violet} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 3" opacity=".6"/>
              {mapped.map((p,i)=>(
                <circle key={i} cx={p.x} cy={p.y} r={i===mapped.length-1?7:4}
                  fill={i===mapped.length-1?COLORS.leaf:"#fff"} stroke={i===mapped.length-1?COLORS.leaf:COLORS.violet}
                  strokeWidth="2" opacity={0.5+0.5*(i/mapped.length)}/>
              ))}
              {mapped.length>0 && <circle cx={mapped[mapped.length-1].x} cy={mapped[mapped.length-1].y} r={10} fill="none" stroke={COLORS.leaf} strokeWidth="1.5" opacity=".45" style={{animation:"pulseRing 2s infinite"}}/>}
            </>;
          })()}
          {/* Center marker when no tracking */}
          {!showMap && <>
            <circle cx={134} cy={90} r={8} fill={COLORS.violet} opacity=".25"/>
            <circle cx={134} cy={90} r={4} fill={COLORS.violet}/>
            <text x={134} y={118} textAnchor="middle" fontSize="10" fill={COLORS.inkSoft} fontWeight="600">Bengaluru</text>
          </>}
        </svg>
        {isTracking && (
          <div style={{position:"absolute",top:10,right:10,background:COLORS.leaf,color:"#fff",fontSize:10.5,fontWeight:700,padding:"4px 10px",borderRadius:20,display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"#fff",animation:"blink 1s infinite"}}/>
            {t("trackActive")}
          </div>
        )}
      </div>

      <button onClick={onStart} disabled={isTracking} style={{width:"100%",border:"none",background:isTracking?COLORS.line:COLORS.violet,color:isTracking?COLORS.inkSoft:"#fff",borderRadius:14,padding:"13px 0",fontWeight:700,fontSize:13.5,cursor:isTracking?"default":"pointer",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
        <span>{Ic.pin}</span>{isTracking?t("trackActive"):t("trackStart")}
      </button>

      {/* Breadcrumbs */}
      {showMap ? (
        <>
          <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,color:COLORS.inkSoft,marginBottom:6}}>{t("locationHistory")}</div>
          {pts.map((p,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 2px",borderBottom:i<pts.length-1?`1px solid ${COLORS.line}`:"none",fontSize:12}}>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:i===pts.length-1?COLORS.leaf:COLORS.violet,flexShrink:0}}/>
                <span style={{fontFamily:"monospace",fontSize:11.5,color:COLORS.inkHi}}>
                  {p.lat.toFixed(4)}°N, {p.lon.toFixed(4)}°E
                </span>
              </div>
              <span style={{color:COLORS.inkSoft,fontSize:11.5,flexShrink:0}}>{p.label}</span>
            </div>
          ))}
        </>
      ) : (
        <div style={{textAlign:"center",fontSize:12.5,color:COLORS.inkSoft,padding:"16px 6px"}}>{t("trackEmpty")}</div>
      )}
    </div>
  );
}

// ─── ACTIONS TAB ──────────────────────────────────────────────────────────────
function ActionsTab({child, t, incident, onReqInfo, onAck, onReqAudio, onLiveTrack, onBuzzDevice}) {
  const isPro = child.variant === "pro";
  const hasOpenIncident = incident && incident.status==="open";

  const actions = [
    {key:"reqInfo", icon:Ic.info, bg:COLORS.violet, label:t("reqInfo"), desc:t("reqInfoDesc"), disabled:false, onClick:onReqInfo},
    {key:"acknowledge", icon:Ic.check, bg:COLORS.leaf, label:t("acknowledge"), desc:t("acknowledgeDesc"), disabled:!hasOpenIncident, onClick:()=>onAck(child.id)},
    {key:"reqAudio", icon:Ic.mic, bg:COLORS.saffron, label:t("reqAudio"), desc:t("reqAudioDesc"), disabled:!isPro, proNote:!isPro, onClick:onReqAudio},
    {key:"liveTrack", icon:Ic.pin, bg:"#1565C0", label:t("liveTrack"), desc:t("liveTrackDesc"), disabled:false, onClick:onLiveTrack},
    {key:"buzzDevice", icon:Ic.volume, bg:COLORS.red, label:"Trigger Piezo Buzzer", desc:"Activate a loud 95dB alarm on the wearable device to alert people nearby", disabled:false, onClick:onBuzzDevice},
  ];

  return (
    <div style={{padding:"4px 16px 0"}}>
      <div style={{fontSize:12.5,fontWeight:700,textTransform:"uppercase",letterSpacing:.6,color:COLORS.inkSoft,marginBottom:10}}>{t("quickActions")}</div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {actions.map(a=>(
          <button key={a.key} onClick={a.disabled?undefined:a.onClick} disabled={a.disabled}
            style={{background:COLORS.card,border:`1px solid ${a.disabled?COLORS.line:COLORS.line}`,borderRadius:18,padding:14,textAlign:"left",display:"flex",alignItems:"flex-start",gap:12,cursor:a.disabled?"default":"pointer",opacity:a.disabled?0.5:1,transition:"all .15s"}}>
            <div style={{width:42,height:42,borderRadius:13,background:a.disabled?COLORS.line:a.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              {a.icon}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:13.5,color:COLORS.inkHi,display:"flex",alignItems:"center",gap:6}}>
                {a.label}
                {a.proNote && <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:8,background:COLORS.amberSoft,color:COLORS.amber}}>{t("proOnly")}</span>}
              </div>
              <div style={{fontSize:12,color:COLORS.inkSoft,marginTop:3,lineHeight:1.4}}>{a.desc}</div>
              {a.key==="reqAudio" && (
                <div style={{display:"flex",alignItems:"flex-start",gap:5,marginTop:7,background:COLORS.sand,borderRadius:9,padding:"6px 8px"}}>
                  <span style={{color:COLORS.inkSoft,flexShrink:0,marginTop:1}}>{Ic.lock}</span>
                  <span style={{fontSize:10.5,color:COLORS.inkSoft,lineHeight:1.4}}>{t("audioPrivacy")}</span>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Packet pipeline note */}
      <div style={{marginTop:14,padding:"10px 12px",background:COLORS.violetSoft,borderRadius:14,display:"flex",alignItems:"center",gap:8}}>
        <span style={{color:COLORS.violet}}>{Ic.shield}</span>
        <span style={{fontSize:11,color:COLORS.violet,fontWeight:600,lineHeight:1.4}}>All commands go through AES-128-GCM encrypted pipeline (v1→v7)</span>
      </div>
    </div>
  );
}

// ─── GUIDE TAB ────────────────────────────────────────────────────────────────
function GuideTab({t, lang, onLangChange, guideSection, onGuideSection}) {
  const isOnlyLang = guideSection === "lang";
  const parentSteps = ["guideP1","guideP2","guideP3","guideP4"];
  const childSteps = ["guideC1","guideC2","guideC3"];
  const steps = guideSection==="parents" ? parentSteps : childSteps;

  return (
    <div style={{padding:"4px 16px 0"}}>
      {!isOnlyLang && (
        <>
          {/* Segmented */}
          <div style={{display:"flex",background:COLORS.line,borderRadius:13,padding:3,gap:3,marginBottom:14}}>
            {[["parents",t("forParents")],["child",t("forChild")]].map(([k,lbl])=>(
              <button key={k} onClick={()=>onGuideSection(k)} style={{flex:1,border:"none",background:guideSection===k?COLORS.card:"transparent",padding:"8px 6px",borderRadius:10,fontSize:12.5,fontWeight:700,color:guideSection===k?COLORS.violetDeep:COLORS.inkSoft,cursor:"pointer",boxShadow:guideSection===k?"0 2px 6px rgba(33,28,46,.10)":"none"}}>
                {lbl}
              </button>
            ))}
          </div>

          {/* Steps */}
          {steps.map((k,i)=>(
            <div key={k} style={{background:COLORS.card,border:`1px solid ${COLORS.line}`,borderRadius:16,padding:13,marginBottom:9,display:"flex",gap:11}}>
              <div style={{width:26,height:26,borderRadius:"50%",background:COLORS.violetSoft,color:COLORS.violetDeep,fontWeight:800,fontSize:12.5,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</div>
              <div style={{fontSize:12.8,lineHeight:1.55,color:COLORS.inkHi}}>{t(k)}</div>
            </div>
          ))}

          {/* Language picker header */}
          <div style={{fontSize:12.5,fontWeight:700,textTransform:"uppercase",letterSpacing:.6,color:COLORS.inkSoft,margin:"16px 2px 8px"}}>{t("langTitle")}</div>
        </>
      )}

      <div style={{background:COLORS.card,border:`1px solid ${COLORS.line}`,borderRadius:16,overflow:"hidden"}}>
        {LANGS.map((l,i)=>(
          <div key={l.code} onClick={()=>onLangChange(l.code)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderBottom:i<LANGS.length-1?`1px solid ${COLORS.line}`:"none",cursor:"pointer",background:lang===l.code?COLORS.violetSoft:"transparent"}}>
            <span style={{fontSize:14,fontWeight:600,color:lang===l.code?COLORS.violetDeep:COLORS.inkHi}}>{l.native}</span>
            {lang===l.code && <div style={{width:18,height:18,borderRadius:"50%",background:COLORS.violet,display:"flex",alignItems:"center",justifyContent:"center"}}><svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5 9.5 17 19 7"/></svg></div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TAB BAR ─────────────────────────────────────────────────────────────────
function TabBar({tab, onTab, t}) {
  const tabs = [{k:"home",ic:Ic.home,lbl:t("home")},{k:"track",ic:Ic.track,lbl:t("track")},{k:"actions",ic:Ic.actions,lbl:t("actions")},{k:"guide",ic:Ic.guide,lbl:t("guide")}];
  return (
    <div style={{position:"absolute",bottom:0,left:0,right:0,height:72,background:"rgba(251,246,238,.96)",borderTop:`1px solid ${COLORS.line}`,display:"flex",backdropFilter:"blur(8px)",zIndex:30,paddingBottom:12}}>
      {tabs.map(tb=>(
        <button key={tb.k} onClick={()=>onTab(tb.k)} style={{flex:1,border:"none",background:"transparent",display:"flex",flexDirection:"column",alignItems:"center",gap:3,justifyContent:"center",color:tab===tb.k?COLORS.violet:COLORS.inkSoft,fontSize:10.5,fontWeight:700,cursor:"pointer"}}>
          {tb.ic}{tb.lbl}
        </button>
      ))}
    </div>
  );
}

// ─── BOTTOM SHEETS ────────────────────────────────────────────────────────────
function Sheet({open, onClose, title, children: ch}) {
  if(!open) return null;
  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}} style={{position:"absolute",inset:0,background:"rgba(20,14,32,.42)",zIndex:70,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div onClick={e=>e.stopPropagation()} style={{width:"100%",background:COLORS.sand,borderRadius:"24px 24px 0 0",padding:"16px 16px 24px",maxHeight:"78%",overflowY:"auto",animation:"slideUp .32s cubic-bezier(.2,.9,.25,1)"}}>
        <div style={{width:36,height:4,background:COLORS.line,borderRadius:3,margin:"0 auto 14px"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <span style={{fontWeight:700,fontSize:15,color:COLORS.inkHi}}>{title}</span>
          <button onClick={onClose} style={{border:"none",background:"transparent",cursor:"pointer",color:COLORS.inkSoft,padding:4}}>{Ic.close}</button>
        </div>
        {ch}
      </div>
    </div>
  );
}

function ChildSheet({currentId, t, onSelect, onClose}) {
  return (
    <div>
      <div style={{fontSize:12,color:COLORS.inkSoft,marginBottom:10}}>{t("switchHint")}</div>
      {CHILDREN_DATA.map(c=>(
        <div key={c.id} onClick={()=>{onSelect(c.id);onClose();}} style={{display:"flex",alignItems:"center",gap:11,padding:"11px 8px",borderRadius:14,cursor:"pointer",background:currentId===c.id?COLORS.violetSoft:"transparent",marginBottom:2}}>
          <StatusRing name={c.name} sk={currentId===c.id?"alert":"safe"} size={40}/>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:13.5,color:COLORS.inkHi}}>{c.name}</div>
            <div style={{fontSize:11.5,color:COLORS.inkSoft}}>{c.id} · {c.age} {t("yearsOld")}</div>
          </div>
          {currentId===c.id && <span style={{color:COLORS.violet}}>✓</span>}
        </div>
      ))}
    </div>
  );
}

function ImmediateActionPopup({packet, t, onClose, onAck, onReqAudio, onLiveTrack, onEscalate, onBuzzDevice}) {
  if (!packet) return null;
  const isPro = packet.variant === "pro";
  const mapsUrl = `https://www.google.com/maps?q=${packet.lat},${packet.lon}`;
  const police = getNearestPolice(packet.lat, packet.lon);

  return (
    <div style={{
      position: "absolute",
      inset: 0,
      background: "rgba(20,14,32,0.6)",
      backdropFilter: "blur(4px)",
      zIndex: 90,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16
    }}>
      <div style={{
        width: "100%",
        maxWidth: 340,
        background: COLORS.sand,
        borderRadius: 24,
        border: `2.5px solid ${packet.type === "routine" ? COLORS.leaf : COLORS.red}`,
        padding: 20,
        boxShadow: "0 24px 48px rgba(0,0,0,0.35)",
        animation: "slideUp 0.3s cubic-bezier(0.2, 0.9, 0.25, 1)"
      }}>
        {/* Header */}
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12}}>
          <div>
            <div style={{
              fontSize: 10.5,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              color: packet.type === "routine" ? COLORS.leaf : COLORS.red,
              marginBottom: 2
            }}>
              {packet.type === "routine" ? "Routine Signal" : "Emergency Alert"}
            </div>
            <h3 style={{fontFamily: "'Sora',sans-serif", fontSize: 16, margin: 0, color: COLORS.inkHi}}>
              {packet.type === "sos" ? "SOS Button Pressed" : packet.type === "fall" ? "Fall Detected" : "Routine Heartbeat"}
            </h3>
          </div>
          <button onClick={onClose} style={{border: "none", background: "transparent", cursor: "pointer", color: COLORS.inkSoft, padding: 4}}>{Ic.close}</button>
        </div>

        {/* Child Details card */}
        <div style={{background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 12, marginBottom: 12}}>
          <div style={{display: "flex", justifyContent: "space-between", marginBottom: 6}}>
            <span style={{fontSize: 12, fontWeight: 700, color: COLORS.inkHi}}>{packet.childName}</span>
            <span style={{fontSize: 11, color: COLORS.inkSoft}}>{packet.childId}</span>
          </div>
          <div style={{display: "flex", flexWrap: "wrap", gap: 8, fontSize: 11, color: COLORS.inkSoft}}>
            <div>🔋 {packet.battery}%</div>
            <div>📂 {packet.storage}% Storage</div>
            <div>🔊 Model: {isPro ? "Pro" : "Base"}</div>
            <div>🎙️ Keyword: <strong>{packet.keyword || "N/A"}</strong></div>
            {packet.type !== "routine" && (
              <div style={{color: COLORS.red, fontWeight: 700}}>⚠️ Distress: {packet.distressScore}</div>
            )}
          </div>
          <div style={{marginTop:8, borderTop:`1px solid ${COLORS.line}`, paddingTop:8, fontSize:11}}>
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{color:COLORS.violet, fontWeight:700, textDecoration:"none", display:"inline-flex", alignItems:"center", gap:3}}>
              <span>📍</span> View in Google Maps
            </a>
          </div>
        </div>

        {/* Nearest Police Station Details */}
        <div style={{
          background: COLORS.violetSoft,
          border: `1px solid ${COLORS.line}`,
          borderRadius: 14,
          padding: 12,
          marginBottom: 16,
          fontSize: 11,
          color: COLORS.violetDeep
        }}>
          <div style={{fontWeight: 700, display: "flex", alignItems: "center", gap: 4, marginBottom: 4}}>
            <span>👮</span> Nearest Police Station:
          </div>
          <div style={{fontWeight: 700, color: COLORS.inkHi}}>{police.name}</div>
          <div style={{color: COLORS.inkSoft, marginTop: 2}}>
            📍 Area: <strong style={{color: COLORS.inkHi}}>{police.area}</strong>
          </div>
          <div style={{color: COLORS.inkSoft, marginTop: 2}}>
            📞 Contact: <strong style={{color: COLORS.inkHi}}>{police.contact}</strong>
          </div>
          <div style={{color: COLORS.inkSoft, marginTop: 2}}>
            🚗 Distance: <strong style={{color: COLORS.inkHi}}>{police.distance} km</strong>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{display: "flex", flexDirection: "column", gap: 8}}>
          {/* Send Acknowledgement */}
          <button onClick={() => { onAck(packet.childId); onClose(); }} style={{
            width: "100%",
            border: "none",
            background: COLORS.leaf,
            color: "#fff",
            borderRadius: 12,
            padding: "11px 0",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6
          }}>
            <span>✓</span> Acknowledge Alert
          </button>

          {/* Escalate to Help Centre */}
          <button onClick={() => { onEscalate(packet.childId); onClose(); }} style={{
            width: "100%",
            border: "none",
            background: COLORS.red,
            color: "#fff",
            borderRadius: 12,
            padding: "11px 0",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6
          }}>
            <span>🚨</span> Escalate to Help Centre
          </button>

          {/* Trigger Piezo Buzzer */}
          <button onClick={() => { onBuzzDevice(); onClose(); }} style={{
            width: "100%",
            border: "none",
            background: COLORS.saffron,
            color: "#fff",
            borderRadius: 12,
            padding: "11px 0",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6
          }}>
            <span>🔊</span> Trigger Piezo Buzzer
          </button>

          {/* Live Tracking */}
          <button onClick={() => { onLiveTrack(); onClose(); }} style={{
            width: "100%",
            border: `1.5px solid ${COLORS.violet}`,
            background: COLORS.card,
            color: COLORS.violetDeep,
            borderRadius: 12,
            padding: "9px 0",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6
          }}>
            <span>📍</span> Start Live Tracking
          </button>

          {/* Request Audio */}
          <button 
            onClick={() => { if (isPro) { onReqAudio(); onClose(); } }} 
            disabled={!isPro} 
            style={{
              width: "100%",
              border: "none",
              background: isPro ? COLORS.violet : COLORS.line,
              color: isPro ? "#fff" : COLORS.inkSoft,
              borderRadius: 12,
              padding: "11px 0",
              fontWeight: 700,
              fontSize: 13,
              cursor: isPro ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6
            }}
          >
            <span>🎙️</span> Request Audio {!isPro && " (Pro Only)"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NotifSheet({notifs, t, onClear, onClose}) {
  return (
    <div>
      {notifs.length>0 && <button onClick={onClear} style={{float:"right",border:"none",background:"transparent",fontSize:12.5,color:COLORS.violet,fontWeight:700,cursor:"pointer",marginBottom:8}}>{t("clearAll")}</button>}
      <div style={{clear:"both"}}/>
      {notifs.length===0 ? (
        <div style={{textAlign:"center",fontSize:13,color:COLORS.inkSoft,padding:"24px 0"}}>{t("noNotifs")}</div>
      ) : notifs.map((n,i)=>(
        <div key={i} style={{padding:"10px 0",borderBottom:i<notifs.length-1?`1px solid ${COLORS.line}`:"none"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
            <span style={{fontWeight:700,fontSize:12.5,color:n.urgent?COLORS.red:COLORS.inkHi}}>{n.title}</span>
            <span style={{fontSize:10.5,color:COLORS.inkSoft}}>{n.time}</span>
          </div>
          <div style={{fontSize:12,color:COLORS.inkSoft,marginTop:2,lineHeight:1.4}}>{n.body}</div>
          {n.mapsUrl && (
            <div style={{marginTop:4,fontSize:11}}>
              <a href={n.mapsUrl} target="_blank" rel="noopener noreferrer" style={{color:COLORS.violet,fontWeight:700,textDecoration:"none",display:"inline-flex",alignItems:"center",gap:3}}>
                <span>📍</span> Google Maps
              </a>
            </div>
          )}
          {n.params && (
            <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:4}}>
              {Object.entries(n.params).map(([key, val]) => (
                <span key={key} style={{fontSize:9,background:COLORS.violetSoft,color:COLORS.violetDeep,padding:"1px 4px",borderRadius:4}}>
                  {key[0]}:{val}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── TOAST ───────────────────────────────────────────────────────────────────
function Toast({message, show}) {
  return (
    <div style={{position:"absolute",bottom:86,left:"50%",transform:`translateX(-50%) translateY(${show?0:16}px)`,zIndex:80,background:COLORS.inkHi,color:"#fff",fontSize:12.5,fontWeight:600,padding:"10px 16px",borderRadius:30,opacity:show?1:0,transition:"all .3s ease",whiteSpace:"nowrap",maxWidth:"88%",textAlign:"center",pointerEvents:"none"}}>
      {message}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function ShaktiPinApp() {
  const [lang, setLang] = useState("en");
  const [childId, setChildId] = useState("SP-1023");
  const [tab, setTab] = useState("home");
  const [guideSection, setGuideSection] = useState("parents");
  const [incidents, setIncidents] = useState(INITIAL_INCIDENTS);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [trackingData, setTrackingData] = useState({});
  const [isTracking, setIsTracking] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [push, setPush] = useState(null);
  const [toast, setToast] = useState(null);
  const [activeAlertPopup, setActiveAlertPopup] = useState(null);
  const trackTimer = useRef(null);
  const toastTimer = useRef(null);

  const tx = key => (T[lang]?.[key] ?? T.en[key] ?? key);
  const child = CHILDREN_DATA.find(c=>c.id===childId);
  const sk = statusKey(incidents[childId]);
  const incident = incidents[childId];

  // clock
  const [clock, setClock] = useState("9:41");
  useEffect(()=>{
    const id=setInterval(()=>{const d=new Date();let h=d.getHours(),m=d.getMinutes(),ap=h>=12?"PM":"AM";h=h%12;if(h===0)h=12;setClock(`${h}:${String(m).padStart(2,"0")}`);},10000);
    return()=>clearInterval(id);
  },[]);

  const showToast = msg => {
    setToast(msg);
    if(toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(()=>setToast(null),2600);
  };
  const showPush = (title, body, urgent = false, packet = null) => {
    let policeParams = {};
    if (packet) {
      const police = getNearestPolice(packet.lat, packet.lon);
      policeParams = {
        "Nearest Police": `${police.name} (${police.distance} km)`,
        "Police Contact": police.contact,
      };
    }

    const pushObj = {
      title,
      body,
      urgent,
      mapsUrl: packet ? `https://www.google.com/maps?q=${packet.lat},${packet.lon}` : null,
      params: packet ? {
        "Device ID": packet.id,
        "Battery": `${packet.battery}%`,
        "Distress Score": packet.distressScore,
        "Keyword": packet.keyword || "N/A",
        "Storage": `${packet.storage}%`,
        "Fall Detected": packet.fallDetected ? "Yes" : "No",
        "Coords": `${packet.lat.toFixed(4)}°N, ${packet.lon.toFixed(4)}°E`,
        ...policeParams
      } : null
    };
    setPush(pushObj);
    setTimeout(()=>setPush(prev => prev && prev.title === title ? null : prev), 8000);
    setUnread(u=>u+1);
    setNotifications(n=>[{
      title,
      body,
      time: clock,
      urgent,
      mapsUrl: pushObj.mapsUrl,
      params: pushObj.params
    }, ...n]);
  };

  const handleAck = id => {
    setIncidents(prev=>({...prev,[id]:{...prev[id],status:"acknowledged"}}));
    showToast(tx("toastAck"));
  };
  const handleEscalate = id => {
    setIncidents(prev=>({...prev,[id]:{...prev[id],status:"escalated"}}));
    showToast(tx("toastEscalated"));
    showPush(tx("pushTitle"), tx("nearbyHelp"), false, {
      id: child.id,
      battery: child.battery,
      distressScore: child.distress,
      storage: child.storage,
      fallDetected: incidents[id]?.type === "fall",
      lat: child.lat,
      lon: child.lon
    });
  };
  const handleReqInfo = () => {
    showToast(tx("toastInfo"));
    showPush(tx("pushTitle"), tx("packetReceived"), false, {
      id: child.id,
      battery: child.battery,
      distressScore: child.distress,
      storage: child.storage,
      fallDetected: false,
      lat: child.lat,
      lon: child.lon
    });
  };
  const handleReqAudio = () => {
    showToast(tx("toastAudio"));
    showPush(tx("pushTitle"), "Audio summary: keyword=okay, distress_score=12, AES-GCM ✓", false, {
      id: child.id,
      battery: child.battery,
      distressScore: 12,
      storage: child.storage,
      fallDetected: false,
      lat: child.lat,
      lon: child.lon
    });
  };
  const handleLiveTrack = () => {
    if(isTracking) return;
    setIsTracking(true);
    showToast(tx("toastTracking"));
    setTab("track");
    const base = {lat:child.lat,lon:child.lon};
    const pts = [];
    let i=0;
    const gen = ()=>{
      if(i>=11){
        setIsTracking(false);
        showPush(tx("pushTitle"), tx("trackDone"), false, {
          id: child.id,
          battery: child.battery,
          distressScore: child.distress,
          storage: child.storage,
          fallDetected: false,
          lat: child.lat,
          lon: child.lon,
          keyword: "tracking"
        });
        return;
      }
      const p = randGPS(i===0?base:{lat:pts[pts.length-1].lat,lon:pts[pts.length-1].lon},0.003);
      p.label = i===0?tx("justNow"):`T+${i*3} ${tx("minAgo")}`;
      pts.push(p);
      setTrackingData(d=>({...d,[childId]:[...pts]}));
      i++;
      trackTimer.current = setTimeout(gen,700);
    };
    gen();
  };
  const handleBuzzDevice = () => {
    showToast("Command sent: Piezo Buzzer activated");
    showPush("SHAKTI-PIN Buzz", `Loud 95dB Piezo Buzzer triggered on ${child.name}'s device`, true, {
      id: child.id,
      battery: child.battery,
      distressScore: child.distress,
      storage: child.storage,
      fallDetected: false,
      lat: child.lat,
      lon: child.lon,
      keyword: "buzzer_active"
    });
  };

  // Demo simulators
  const simulateSOS = () => {
    const c = CHILDREN_DATA.find(c=>c.id===childId);
    setIncidents(prev=>({...prev,[childId]:{type:"sos",status:"open",score:95,title:"sos",time:clock}}));
    const packet = {
      type: "sos",
      id: childId,
      childId: childId,
      childName: c.name,
      battery: c.battery,
      distressScore: 95,
      storage: c.storage,
      variant: c.variant,
      fallDetected: false,
      lat: c.lat,
      lon: c.lon,
      keyword: "screaming"
    };
    showPush(`🚨 ${tx("alertTitle_sos")} — ${c.name}`, tx("alertBody"), true, packet);
    setActiveAlertPopup(packet);
  };
  const simulateFall = () => {
    const c = CHILDREN_DATA.find(c=>c.id===childId);
    setIncidents(prev=>({...prev,[childId]:{type:"fall",status:"open",score:82,title:"fall",time:clock}}));
    const packet = {
      type: "fall",
      id: childId,
      childId: childId,
      childName: c.name,
      battery: c.battery,
      distressScore: 82,
      storage: c.storage,
      variant: c.variant,
      fallDetected: true,
      lat: c.lat,
      lon: c.lon,
      keyword: "thud"
    };
    showPush(`⚠️ ${tx("alertTitle_fall")} — ${c.name}`, tx("alertBody"), true, packet);
    setActiveAlertPopup(packet);
  };
  const simulateHeartbeat = () => {
    const c = CHILDREN_DATA.find(c=>c.id===childId);
    const packet = {
      type: "routine",
      id: childId,
      childId: childId,
      childName: c.name,
      battery: c.battery,
      distressScore: 5,
      storage: c.storage,
      variant: c.variant,
      fallDetected: false,
      lat: c.lat,
      lon: c.lon,
      keyword: "speech"
    };
    showPush(tx("pushTitle"), `${c.name} — ${tx("packetReceived")} · battery ${c.battery}%`, false, packet);
    setActiveAlertPopup(packet);
  };
  const simulateResolve = () => {
    setIncidents(prev=>{const next={...prev};delete next[childId];return next;});
    showToast("✓ Marked safe — alert closed");
    showPush(tx("pushTitle"),`${child.name} is safe now.`,false);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Noto+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
        @keyframes slideDown{from{transform:translateY(-110%);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes slideUp{from{transform:translateY(110%)}to{transform:translateY(0)}}
        @keyframes pulseRing{0%{box-shadow:0 0 0 0 rgba(215,38,61,.4)}70%{box-shadow:0 0 0 9px rgba(215,38,61,0)}100%{box-shadow:0 0 0 0 rgba(215,38,61,0)}}
        @keyframes pulseAlert{0%{box-shadow:0 0 0 0 rgba(215,38,61,.2)}70%{box-shadow:0 0 0 8px rgba(215,38,61,0)}100%{box-shadow:0 0 0 0 rgba(215,38,61,0)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        body{font-family:'Noto Sans','Noto Sans Devanagari','Noto Sans Kannada','Noto Sans Telugu','Noto Sans Bengali','Noto Sans Tamil',system-ui,sans-serif;}
        button:focus-visible{outline:2px solid #5B3A8E;outline-offset:2px;}
      `}</style>

      <div style={{display:"flex",gap:28,flexWrap:"wrap",justifyContent:"center",alignItems:"flex-start",padding:"32px 18px 60px",minHeight:"100vh",background:"radial-gradient(circle at 18% 0%, #EFE6F9 0%, #FBF6EE 48%)"}}>

        {/* ── PHONE FRAME ── */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
          <div style={{width:"min(388px,92vw)",aspectRatio:"9/19.5",background:"#0E0B16",borderRadius:42,padding:12,boxShadow:"0 36px 70px -24px rgba(33,28,46,.45), 0 0 0 1px rgba(0,0,0,.04)"}}>
            <div style={{position:"relative",width:"100%",height:"100%",background:COLORS.sand,borderRadius:32,overflow:"hidden",display:"flex",flexDirection:"column"}}>
              {/* Notch */}
              <div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:118,height:22,background:"#0E0B16",borderRadius:"0 0 14px 14px",zIndex:40}}/>
              {/* Push layer */}
              <div style={{position:"absolute",top:0,left:0,right:0,zIndex:60,pointerEvents:"none"}}>
                <div style={{pointerEvents:"auto"}}><PushBanner push={push} onDismiss={()=>setPush(null)}/></div>
              </div>
              {/* OS Bar */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 22px 0",fontSize:12.5,fontWeight:700,color:COLORS.inkHi,flexShrink:0}}>
                <span>{clock}</span>
                <div style={{display:"flex",gap:5,alignItems:"center",opacity:.8}}>
                  <svg width="14" height="11" viewBox="0 0 14 11"><rect x="0" y="7" width="3" height="4" rx=".5" fill="currentColor"/><rect x="4.3" y="4.5" width="3" height="6.5" rx=".5" fill="currentColor"/><rect x="8.6" y="2" width="3" height="9" rx=".5" fill="currentColor"/></svg>
                  <svg width="18" height="11" viewBox="0 0 18 11"><rect x=".5" y=".5" width="14" height="10" rx="2.2" stroke="currentColor"/><rect x="2" y="2" width="9" height="7" rx="1" fill="currentColor"/><rect x="15.3" y="3.3" width="1.6" height="4.4" rx=".6" fill="currentColor"/></svg>
                </div>
              </div>
              {/* App Bar */}
              <AppBar child={child} lang={lang} t={tx} unread={unread} sk={sk} onLang={()=>setSheet("lang")} onNotif={()=>{setSheet("notif");setUnread(0);}} onChildPick={()=>setSheet("child")}/>
              {/* Content */}
              <div style={{flex:1,overflowY:"auto",paddingBottom:80}} className="content">
                {tab==="home" && <HomeTab child={child} t={tx} incidents={incidents} onAck={handleAck} onEscalate={handleEscalate} sk={sk} onSelectChild={setChildId} onBuzzDevice={handleBuzzDevice}/>}
                {tab==="track" && <TrackTab child={child} t={tx} trackingData={trackingData} isTracking={isTracking} onStart={handleLiveTrack}/>}
                {tab==="actions" && <ActionsTab child={child} t={tx} incident={incident} onReqInfo={handleReqInfo} onAck={handleAck} onReqAudio={handleReqAudio} onLiveTrack={handleLiveTrack} onBuzzDevice={handleBuzzDevice}/>}
                {tab==="guide" && <GuideTab t={tx} lang={lang} onLangChange={setLang} guideSection={guideSection} onGuideSection={setGuideSection}/>}
              </div>
              {/* Tab Bar */}
              <TabBar tab={tab} onTab={setTab} t={tx}/>
              {/* Sheets */}
              <Sheet open={sheet==="child"} onClose={()=>setSheet(null)} title={tx("selectChild")}>
                <ChildSheet currentId={childId} t={tx} onSelect={setChildId} onClose={()=>setSheet(null)}/>
              </Sheet>
              <Sheet open={sheet==="lang"} onClose={()=>setSheet(null)} title={tx("langTitle")}>
                <GuideTab t={tx} lang={lang} onLangChange={l=>{setLang(l);setSheet(null);}} guideSection="lang" onGuideSection={()=>{}}/>
              </Sheet>
              <Sheet open={sheet==="notif"} onClose={()=>setSheet(null)} title={tx("notifications")}>
                <NotifSheet notifs={notifications} t={tx} onClear={()=>setNotifications([])} onClose={()=>setSheet(null)}/>
              </Sheet>
              {/* Toast */}
              <Toast message={toast} show={!!toast}/>
              {/* Immediate Action Popup */}
              <ImmediateActionPopup 
                packet={activeAlertPopup} 
                t={tx} 
                onClose={() => setActiveAlertPopup(null)} 
                onAck={handleAck} 
                onReqAudio={handleReqAudio} 
                onLiveTrack={handleLiveTrack}
                onEscalate={handleEscalate}
                onBuzzDevice={handleBuzzDevice}
              />
            </div>
          </div>
        </div>

        {/* ── DEMO PANEL ── */}
        <aside style={{width:272,background:COLORS.card,border:`1px solid ${COLORS.line}`,borderRadius:20,padding:20,boxShadow:"0 8px 24px rgba(33,28,46,.09)"}}>
          <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:14,margin:"0 0 4px",color:COLORS.violetDeep}}>Prototype controls</h3>
          <p style={{fontSize:12,color:COLORS.inkSoft,margin:"0 0 16px",lineHeight:1.6}}>These simulate the wearable device sending data so you can see push notifications and live status changes in real time.</p>
          {[
            {emoji:"🚨",label:"Simulate SOS button press",fn:simulateSOS,color:COLORS.redSoft,dot:COLORS.red},
            {emoji:"⚠️",label:"Simulate fall detected",fn:simulateFall,color:COLORS.amberSoft,dot:COLORS.amber},
            {emoji:"💚",label:"Simulate routine heartbeat",fn:simulateHeartbeat,color:COLORS.leafSoft,dot:COLORS.leaf},
          ].map(b=>(
            <button key={b.label} onClick={b.fn} style={{width:"100%",textAlign:"left",border:`1px solid ${COLORS.line}`,background:COLORS.sand,borderRadius:12,padding:"10px 12px",fontSize:12.5,fontWeight:600,marginBottom:8,color:COLORS.inkHi,display:"flex",alignItems:"center",gap:9,cursor:"pointer"}}>
              <span style={{width:8,height:8,borderRadius:"50%",background:b.dot,flexShrink:0}}/>
              <span>{b.emoji} {b.label}</span>
            </button>
          ))}
          <div style={{borderTop:`1px solid ${COLORS.line}`,paddingTop:12,marginTop:6,fontSize:10.5,color:COLORS.inkSoft,lineHeight:1.6}}>
            <b>Switch child</b>: tap the child card in the app header or at the bottom list.<br/>
            <b>Change language</b>: tap the globe icon or use the Guide tab.<br/>
            <b>Notifications</b>: tap the bell — unread count clears on open.<br/>
            <b>Live tracking</b>: go to Actions or Track tab and start a session.
          </div>
        </aside>
      </div>
    </>
  );
}
