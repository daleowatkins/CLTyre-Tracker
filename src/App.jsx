import * as React from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { 
  Truck, 
  Wrench, 
  ClipboardList, 
  AlertTriangle, 
  CheckCircle, 
  Plus, 
  Search, 
  Barcode, 
  History,
  ArrowRight,
  Printer,
  Filter,
  X,
  Trash2,
  Calendar,
  Gauge,
  Clock,
  Settings,
  Save,
  ArrowLeft,
  List,
  FileSpreadsheet,
  Download,
  Database,
  User,
  Lock,
  LogOut,
  Users,
  Camera,
  ShieldCheck,
  ArrowUpDown,
  Bell,
  RefreshCw,
  Recycle,
  ChevronRight,
  AlertOctagon,
  GripVertical,
  Link2,
  Layers
} from 'lucide-react';

const { useState, useEffect, useRef, useMemo } = React;

// --- Firebase Setup ---
const firebaseConfig = {
  apiKey: "AIzaSyAWELn6lSPNa5WIjG_wFLv4nkzk1CaLxq8",
  authDomain: "tyre-tracker-ccbd1.firebaseapp.com",
  projectId: "tyre-tracker-ccbd1",
  storageBucket: "tyre-tracker-ccbd1.firebasestorage.app",
  messagingSenderId: "90986714992",
  appId: "1:90986714992:web:388e83080de978ec68e1b5",
  measurementId: "G-VEVZFGKE16"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'tyre-tracker-ccbd1'; 

// --- Constants ---
const VEHICLE_COLORS = [
  { id: 'white', label: 'Default', bg: 'bg-white', border: 'border-slate-200', hover: 'hover:bg-slate-50' },
  { id: 'red', label: 'Red', bg: 'bg-red-50', border: 'border-red-200', hover: 'hover:bg-red-100' },
  { id: 'orange', label: 'Orange', bg: 'bg-orange-50', border: 'border-orange-200', hover: 'hover:bg-orange-100' },
  { id: 'amber', label: 'Yellow', bg: 'bg-amber-50', border: 'border-amber-200', hover: 'hover:bg-amber-100' },
  { id: 'green', label: 'Green', bg: 'bg-green-50', border: 'border-green-200', hover: 'hover:bg-green-100' },
  { id: 'blue', label: 'Blue', bg: 'bg-blue-50', border: 'border-blue-200', hover: 'hover:bg-blue-100' },
  { id: 'purple', label: 'Purple', bg: 'bg-purple-50', border: 'border-purple-200', hover: 'hover:bg-purple-100' },
  { id: 'slate', label: 'Grey', bg: 'bg-slate-100', border: 'border-slate-300', hover: 'hover:bg-slate-200' },
];

const getVehicleColorClasses = (colorId) => {
  return VEHICLE_COLORS.find(c => c.id === colorId) || VEHICLE_COLORS[0];
};

// --- Custom Styles for Animations ---
const styles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-enter {
    animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .glass-panel {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  .btn-press:active {
    transform: scale(0.97);
  }
  .drag-item {
    cursor: grab;
  }
  .drag-item:active {
    cursor: grabbing;
  }
  /* Custom Scrollbar */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
`;

// --- Utils & Helpers ---
const generateId = () => Math.random().toString(36).substr(2, 9);
const generateBarcode = () => '8' + Math.floor(10000000 + Math.random() * 90000000).toString();

const playTruckHorn = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    
    const playTone = (freq, start, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      gain.gain.setValueAtTime(0.1, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      
      osc.start(start);
      osc.stop(start + duration);
    };

    // Beep Beep!
    const now = ctx.currentTime;
    playTone(150, now, 0.15);
    playTone(150, now + 0.2, 0.3);
  } catch (e) {
    console.error("Audio error", e);
  }
};

const calculateAge = (dot) => {
  if (!dot || dot.length !== 4) return 'Unknown';
  const week = parseInt(dot.substring(0, 2));
  const year = parseInt("20" + dot.substring(2, 4));
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentWeek = Math.floor((now - new Date(currentYear, 0, 1)) / (7 * 24 * 60 * 60 * 1000));
  let ageInWeeks = ((currentYear - year) * 52) + (currentWeek - week);
  if (ageInWeeks < 0) ageInWeeks = 0;
  if (ageInWeeks < 52) return `${ageInWeeks}w`;
  return `${(ageInWeeks / 52).toFixed(1)}y`;
};

const getAxleGroup = (pos) => {
  if (pos.startsWith('F')) return 'front';
  if (pos.startsWith('D')) return 'drive';
  if (pos.startsWith('T')) return 'tag';
  if (pos.startsWith('R') && (pos.includes('S') || pos === 'RL' || pos === 'RR')) return 'rear_steer';
  if (pos.startsWith('R')) return 'rear';
  return 'front';
};

const getHubId = (pos) => {
  if (pos.length === 3 && (pos.endsWith('I') || pos.endsWith('O'))) {
    return pos.substring(0, 2); // RLI -> RL
  }
  return pos;
};

const formatAxleName = (group) => {
  switch(group) {
    case 'front': return 'Steer Axle';
    case 'drive': return 'Drive Axle';
    case 'tag': return 'Tag Axle';
    case 'rear_steer': return 'Rear Steer Axle';
    case 'rear': return 'Rear Axle';
    default: return 'Axle';
  }
};

const formatPosition = (pos) => {
  const map = { 
    'FL': 'Front Left', 'FR': 'Front Right', 
    'RL': 'Rear Left', 'RR': 'Rear Right', 
    'RLO': 'Rear Left Outer', 'RLI': 'Rear Left Inner', 
    'RRO': 'Rear Right Outer', 'RRI': 'Rear Right Inner', 
    'DLO': 'Drive Left Outer', 'DLI': 'Drive Left Inner', 
    'DRO': 'Drive Right Outer', 'DRI': 'Drive Right Inner', 
    'RSL': 'Rear Steer Left', 'RSR': 'Rear Steer Right'
  };
  return map[pos] || pos;
};

// --- Hooks ---
const useSortableData = (items, config = null) => {
  const [sortConfig, setSortConfig] = useState(config);

  const sortedItems = useMemo(() => {
    let sortableItems = [...items];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'dot') {
           const parseDot = (val) => {
             if (!val || val.length !== 4) return 0;
             const week = val.substring(0, 2);
             const year = val.substring(2, 4);
             return parseInt(year + week); 
           };
           aValue = parseDot(aValue);
           bValue = parseDot(bValue);
        } 
        else {
            if (aValue === undefined) aValue = '';
            if (bValue === undefined) bValue = '';
            if (typeof aValue === 'string') aValue = aValue.toLowerCase();
            if (typeof bValue === 'string') bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [items, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  return { items: sortedItems, requestSort, sortConfig };
};

// --- UI Helper Components ---

const SortableHeader = ({ label, sortKey, requestSort, sortConfig, className = "" }) => {
  const isActive = sortConfig?.key === sortKey;
  return (
    <th 
      className={`p-3 cursor-pointer hover:bg-blue-50 transition select-none text-slate-500 font-semibold text-xs uppercase tracking-wider ${className}`}
      onClick={() => requestSort(sortKey)}
    >
      <div className="flex items-center gap-1 group">
        {label}
        <span className={`transition-opacity duration-200 ${isActive ? 'opacity-100 text-blue-600' : 'opacity-0 group-hover:opacity-50'}`}>
          <ArrowUpDown className={`w-3 h-3 ${sortConfig?.direction === 'ascending' ? 'rotate-180' : ''}`} />
        </span>
      </div>
    </th>
  );
};

const NavBtn = ({ label, icon: Icon, active, onClick, badge }) => (
  <button 
    onClick={onClick}
    className={`
      relative flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 font-medium text-sm whitespace-nowrap btn-press
      ${active 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 translate-y-[-1px]' 
        : 'text-slate-400 hover:text-white hover:bg-slate-800'
      }
    `}
  >
    <div className="relative">
      <Icon className={`w-4 h-4 ${active ? 'animate-pulse' : ''}`} />
      {badge > 0 && (
        <span className="absolute -top-2.5 -right-2.5 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-900 animate-bounce">
          {badge}
        </span>
      )}
    </div>
    <span className="hidden md:inline">{label}</span>
  </button>
);

const StepIndicator = ({ num, label, active }) => (
  <div className={`flex items-center gap-3 transition-colors duration-300 ${active ? 'text-blue-600' : 'text-slate-300'}`}>
    <div className={`
      w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 transition-all duration-300
      ${active ? 'border-blue-600 bg-blue-50 scale-110 shadow-sm' : 'border-slate-200'}
    `}>
      {num}
    </div>
    <span className="hidden md:inline font-medium text-sm tracking-tight">{label}</span>
  </div>
);

function VehicleFrog({ vehicle, retorques = [], mode = 'view', onSelect }) {
  const { layout, wheels } = vehicle;

  const renderWheel = (posId, label) => {
    const wheelData = wheels[posId];
    const pending = retorques.find(r => r.vehicleReg === vehicle.reg && r.positionId === posId && r.status === 'Pending');
    const isClickable = mode === 'select' || (mode === 'view' && wheelData);

    return (
      <button 
        key={posId} 
        onClick={isClickable ? () => onSelect({ type: 'single', pos: posId }) : undefined} 
        className={`
          relative flex flex-col items-center p-2 rounded-xl border-2 transition-all duration-300 w-24 group
          ${isClickable ? 'cursor-pointer hover:scale-105 active:scale-95' : ''}
          ${wheelData 
            ? 'bg-white border-slate-300 shadow-sm hover:border-blue-500 hover:shadow-md' 
            : 'bg-slate-50 border-dashed border-slate-200 hover:border-slate-300'
          }
          ${pending ? 'ring-2 ring-amber-500 ring-offset-2 animate-pulse' : ''}
        `}
      >
        <div className={`
          w-10 h-14 rounded-md mb-2 border-x-4 transition-all duration-300
          ${wheelData 
            ? 'bg-slate-800 border-slate-700 group-hover:bg-slate-700' 
            : 'bg-slate-200 border-slate-300 opacity-50'
          }
        `}></div>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
        {mode === 'view' && pending && (
          <div className="absolute -top-2 -right-2 bg-amber-500 text-white rounded-full p-1.5 shadow-lg animate-bounce">
            <Wrench className="w-3 h-3"/>
          </div>
        )}
      </button>
    );
  };

  const renderAxle = (wheelsInAxle, axleIds = []) => (
    <div className="flex justify-between items-center w-full max-w-lg mx-auto my-6 relative px-6 group/axle">
      <div className="h-3 bg-slate-200 absolute w-full top-1/2 -translate-y-1/2 -z-10 rounded-full left-0 shadow-inner group-hover/axle:bg-slate-300 transition-colors"></div>
      
      {/* Axle Center Button (for fitting whole axle) */}
      {mode === 'select' && axleIds.length > 0 && (
        <button 
          onClick={() => onSelect({ type: 'axle', positions: axleIds })}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-slate-100 hover:bg-blue-600 hover:text-white p-1 rounded-full shadow border text-slate-400 transition-all scale-0 group-hover/axle:scale-100"
          title="Fit entire axle"
        >
          <Layers className="w-4 h-4" />
        </button>
      )}
      
      {wheelsInAxle}
    </div>
  );

  const renderDual = (outerPos, innerPos, key) => {
    return (
      <div key={key} className="flex gap-2 items-center relative group/dual">
        {renderWheel(outerPos, 'Outer')}
        {/* Dual Link Button */}
        {mode === 'select' && (
           <button 
              onClick={() => onSelect({ type: 'dual', positions: [innerPos, outerPos] })}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-white hover:bg-blue-600 hover:text-white p-1 rounded-full shadow border text-slate-400 transition-all opacity-0 group-hover/dual:opacity-100"
              title="Fit both tyres"
           >
             <Link2 className="w-3 h-3" />
           </button>
        )}
        {renderWheel(innerPos, 'Inner')}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center py-8 select-none transform scale-[0.6] sm:scale-100 origin-top -my-10 sm:my-0">
      <div className="mb-6 text-slate-300 flex flex-col items-center">
        <div className="w-0 h-0 border-l-[24px] border-l-transparent border-r-[24px] border-r-transparent border-b-[36px] border-b-slate-200 drop-shadow-sm"></div>
        <span className="text-xs font-bold mt-2 tracking-widest opacity-50">FRONT</span>
      </div>

      {renderAxle([
        renderWheel('FL', 'Front L'), 
        renderWheel('FR', 'Front R')
      ], ['FL', 'FR'])}

      <div className="h-24 border-l-4 border-slate-200 border-dashed my-2 opacity-50"></div>

      {layout === '2-axle-dual' && renderAxle([
        renderDual('RLO', 'RLI', 'left'), 
        renderDual('RRO', 'RRI', 'right')
      ], ['RLO', 'RLI', 'RRI', 'RRO'])}

      {layout === '2-axle-single' && renderAxle([
        renderWheel('RL', 'Rear L'), 
        renderWheel('RR', 'Rear R')
      ], ['RL', 'RR'])}

      {layout === '3-axle-rigid' && <>
        {renderAxle([
           renderDual('DLO', 'DLI', 'dl'),
           renderDual('DRO', 'DRI', 'dr')
        ], ['DLO', 'DLI', 'DRI', 'DRO'])}
        <div className="h-12 border-l-4 border-slate-200 border-dashed my-2 opacity-50"></div>
        {renderAxle([
           renderWheel('TL', 'Tag L'), 
           renderWheel('TR', 'Tag R')
        ], ['TL', 'TR'])}
      </>}

      {layout === '3-axle-rear-steer' && <>
         {renderAxle([
           renderDual('DLO', 'DLI', 'dl'),
           renderDual('DRO', 'DRI', 'dr')
        ], ['DLO', 'DLI', 'DRI', 'DRO'])}
         {renderAxle([
           renderWheel('RSL', 'R-Steer L'), 
           renderWheel('RSR', 'R-Steer R')
         ], ['RSL', 'RSR'])}
      </>}
    </div>
  );
}

// --- Default Data for Seeding ---
const initialInventory = [
  { id: 't1', brand: 'Michelin', model: 'X Multi Z', size: '295/80R22.5', barcode: '88239101', status: 'In Stock', dot: '1023', isUsed: false },
  { id: 't2', brand: 'Bridgestone', model: 'R-Steer', size: '295/80R22.5', barcode: '88239103', status: 'In Stock', dot: '4522', isUsed: false },
  { id: 't3', brand: 'Michelin', model: 'X Coach', size: '295/80R22.5', barcode: '88239105', status: 'In Stock', dot: '0224', isUsed: false },
  { id: 't4', brand: 'Continental', model: 'VanContact', size: '235/65R16', barcode: '88239106', status: 'In Stock', dot: '2023', isUsed: false },
  { id: 't5', brand: 'Goodyear', model: 'Cargo Vector', size: '235/65R16', barcode: '88239107', status: 'In Stock', dot: '1523', isUsed: false },
];

const initialVehicles = [
  { 
    id: 'v1', reg: 'K26 CLN', type: 'Luton Box Van', layout: '2-axle-dual', 
    specs: { front: { torque: 180, pressure: 55 }, rear: { torque: 180, pressure: 60 } }, wheels: {}, order: 0 
  },
  { 
    id: 'v2', reg: 'L10 NC', type: '2-Axle Coach', layout: '2-axle-dual', 
    specs: { front: { torque: 600, pressure: 120 }, rear: { torque: 600, pressure: 115 } }, wheels: {}, order: 1
  },
  { 
    id: 'v3', reg: 'L1 CLN', type: 'Tri-Axle Coach', layout: '3-axle-rear-steer', 
    specs: { front: { torque: 650, pressure: 125 }, drive: { torque: 600, pressure: 115 }, rear_steer: { torque: 650, pressure: 125 } }, wheels: {}, order: 2
  },
];

const initialSizes = [
  { id: 's1', name: '295/80R22.5' }, { id: 's2', name: '315/80R22.5' }, { id: 's3', name: '385/65R22.5' },
  { id: 's4', name: '235/65R16' }, { id: 's5', name: '215/75R16' }, { id: 's6', name: '205/65R16' }
];

const initialUsers = [
  { id: 'u1', initials: 'ADM', pin: '0000', role: 'Admin' },
  { id: 'u2', initials: 'MGR', pin: '1111', role: 'Manager' },
  { id: 'u3', initials: 'FIT', pin: '2222', role: 'Fitter' }
];

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); 
  const [activeTab, setActiveTab] = useState('fit');
  const [authError, setAuthError] = useState(null);
  
  // Data States
  const [inventory, setInventory] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [retorqueRegister, setRetorqueRegister] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);
  const [fitmentHistory, setFitmentHistory] = useState([]);
  const [removedTyres, setRemovedTyres] = useState([]); 
  const [users, setUsers] = useState([]);

  // --- Notifications State ---
  const [notifiedTasks, setNotifiedTasks] = useState(new Set());

  // --- Auth & Initial Load ---
  useEffect(() => {
    const initAuth = async () => {
      let retries = 3;
      while (retries > 0) {
        try {
          await signInAnonymously(auth);
          return;
        } catch (error) {
          console.error("Auth Failed, retrying...", error);
          retries--;
          if (retries === 0) {
             setAuthError("Unable to connect to database. Please check your connection.");
          }
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    };
    initAuth();
    return onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user) setAuthError(null);
    });
  }, []);

  // --- Firestore Listeners ---
  useEffect(() => {
    if (!firebaseUser) return;

    const getPubCol = (colName) => collection(db, 'artifacts', appId, 'public', 'data', colName);

    const unsubInv = onSnapshot(getPubCol('inventory'), 
      (snap) => setInventory(snap.docs.map(d => ({...d.data(), id: d.id}))), (err) => console.error("Inv error", err));
    
    // Sort vehicles by 'order' field locally
    const unsubVeh = onSnapshot(getPubCol('vehicles'), 
      (snap) => {
        const vs = snap.docs.map(d => ({...d.data(), id: d.id}));
        vs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setVehicles(vs);
      }, (err) => console.error("Veh error", err));

    const unsubRet = onSnapshot(getPubCol('retorques'), 
      (snap) => setRetorqueRegister(snap.docs.map(d => ({...d.data(), id: d.id})).sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate))), (err) => console.error("Ret error", err));
    const unsubSizes = onSnapshot(getPubCol('sizes'), 
      (snap) => setAvailableSizes(snap.docs.map(d => ({...d.data(), id: d.id}))), (err) => console.error("Sizes error", err));
    const unsubHist = onSnapshot(getPubCol('history'), 
      (snap) => setFitmentHistory(snap.docs.map(d => ({...d.data(), id: d.id})).sort((a,b) => new Date(b.fitDate) - new Date(a.fitDate))), (err) => console.error("Hist error", err));
    const unsubUsers = onSnapshot(getPubCol('users'), 
      (snap) => setUsers(snap.docs.map(d => ({...d.data(), id: d.id}))), (err) => console.error("Users error", err));
    const unsubRemoved = onSnapshot(getPubCol('removed_tyres'), 
      (snap) => setRemovedTyres(snap.docs.map(d => ({...d.data(), id: d.id})).sort((a,b) => new Date(b.removedDate) - new Date(a.removedDate))), (err) => console.error("Removed error", err));

    return () => { unsubInv(); unsubVeh(); unsubRet(); unsubSizes(); unsubHist(); unsubUsers(); unsubRemoved(); };
  }, [firebaseUser]);

  // --- Notification Logic ---
  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        new Notification("Notifications Enabled", { body: "You will be alerted when retorques are due.", icon: '/pwa-192x192.png' });
      }
    } else {
      alert("This browser does not support web notifications.");
    }
  };

  useEffect(() => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const checkRetorques = () => {
      const now = new Date();
      const newNotified = new Set(notifiedTasks);
      let changed = false;

      retorqueRegister.forEach(task => {
        if (task.status === 'Pending' && !newNotified.has(task.id)) {
          const dueDate = new Date(task.dueDate);
          if (now >= dueDate) {
            try {
              new Notification(`Retorque Due: ${task.vehicleReg} (${task.reason})`, {
                body: `${task.type} - ${formatPosition(task.positionId)} is due.\nFitter: ${task.fitter}`,
                icon: '/pwa-192x192.png',
                requireInteraction: true 
              });
            } catch (e) {
              console.log("Notification trigger error:", e);
            }
            newNotified.add(task.id);
            changed = true;
          }
        }
      });

      if (changed) setNotifiedTasks(newNotified);
    };

    const interval = setInterval(checkRetorques, 60000);
    checkRetorques(); 

    return () => clearInterval(interval);
  }, [retorqueRegister, notifiedTasks]);


  // --- Database Actions ---

  const seedDatabase = async () => {
    if(!confirm("This will populate the database with demo data. Continue?")) return;
    const batchPromises = [];
    const getPubCol = (colName) => collection(db, 'artifacts', appId, 'public', 'data', colName);
    
    initialInventory.forEach(item => batchPromises.push(addDoc(getPubCol('inventory'), item)));
    initialVehicles.forEach(item => batchPromises.push(addDoc(getPubCol('vehicles'), item)));
    initialSizes.forEach(item => batchPromises.push(addDoc(getPubCol('sizes'), item)));
    initialUsers.forEach(item => batchPromises.push(addDoc(getPubCol('users'), item)));
    
    await Promise.all(batchPromises);
    alert("Database seeded!");
  };

  const addBatchStock = async (data, quantity) => {
    const promises = [];
    const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'inventory');
    for(let i=0; i<quantity; i++) {
      promises.push(addDoc(colRef, { ...data, barcode: generateBarcode(), status: 'In Stock' }));
    }
    await Promise.all(promises);
  };

  const restockRemovedTyre = async (tyreData, newTreadDepth) => {
    const newBarcode = generateBarcode();
    const stockData = {
      brand: tyreData.brand,
      model: tyreData.model,
      size: tyreData.size,
      dot: tyreData.dot,
      isUsed: true,
      treadDepth: newTreadDepth,
      barcode: newBarcode,
      status: 'In Stock',
      prevBarcode: tyreData.barcode // Track history
    };
    
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'inventory'), stockData);
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'removed_tyres', tyreData.id));
    alert(`Tyre restocked with new barcode: ${newBarcode}`);
  };

  const deleteInventoryItem = async (id) => {
    const confirm = window.prompt("Type 'DELETE' to confirm removing this record permanently.");
    if (confirm === 'DELETE') {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'inventory', id));
    }
  };

  const addVehicle = async (vehicleData) => {
    // Determine new order as last
    const maxOrder = vehicles.reduce((max, v) => Math.max(max, v.order || 0), -1);
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'vehicles'), { ...vehicleData, wheels: {}, order: maxOrder + 1 });
  };

  const updateVehicle = async (vehicleData) => {
    const { id, ...data } = vehicleData;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'vehicles', id), data);
  };

  const updateVehicleOrder = async (newVehicles) => {
    const batchPromises = newVehicles.map((v, index) => {
      // Only update if order changed
      if (v.order !== index) {
        return setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'vehicles', v.id), { order: index }, { merge: true });
      }
      return Promise.resolve();
    });
    await Promise.all(batchPromises);
  };

  const deleteVehicle = async (id) => {
    const confirm = window.prompt("Type 'DELETE' to confirm removing this vehicle permanently.");
    if (confirm === 'DELETE') {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'vehicles', id));
    }
  };

  const addSize = async (name) => {
    if(!name) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'sizes'), { name });
  };

  const removeSize = async (id) => {
    if(window.confirm("Remove this size?")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sizes', id));
    }
  };

  const addUser = async (userData) => {
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users'), userData);
  };
  const removeUser = async (id) => {
    if(window.confirm("Remove this user?")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', id));
    }
  };

  const completeRetorque = async (id) => {
    const taskRef = doc(db, 'artifacts', appId, 'public', 'data', 'retorques', id);
    await setDoc(taskRef, { status: 'Completed', completedDate: new Date().toISOString() }, { merge: true });
  };

  const wipeOperationalData = async () => {
    if (window.confirm("DANGER: This will delete ALL Inventory, Retorque Tasks, History Logs, and Removed Tyres. Vehicles and Users will be kept. Are you sure?")) {
      const collections = ['inventory', 'retorques', 'history', 'removed_tyres'];
      
      const wipeCol = async (colName) => {
         const ref = collection(db, 'artifacts', appId, 'public', 'data', colName);
         const snap = await getDocs(ref);
         const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
         await Promise.all(deletePromises);
      };

      try {
        await Promise.all(collections.map(col => wipeCol(col)));
        
        if (window.confirm("Do you also want to remove currently fitted tyres from ALL vehicles? (Recommended for a clean start)")) {
          const vehRef = collection(db, 'artifacts', appId, 'public', 'data', 'vehicles');
          const vehSnap = await getDocs(vehRef);
          const updatePromises = vehSnap.docs.map(d => setDoc(d.ref, { wheels: {} }, { merge: true }));
          await Promise.all(updatePromises);
        }
        
        alert("Operational data wiped successfully.");
      } catch (e) {
        console.error("Wipe failed", e);
        alert("Failed to wipe some data. Check console.");
      }
    }
  };

  // Helper to generate retorque/history logs
  // Returns TRUE if successful, FALSE if error
  const createLogs = async (vehicle, posId, fitDateStr, reason, spec, fitterInitials) => {
    try {
      const fitTimeMs = new Date(fitDateStr).getTime();
      const retorqueCol = collection(db, 'artifacts', appId, 'public', 'data', 'retorques');
      
      // Safety Check
      if (!vehicle.reg || !posId || !fitDateStr || !fitterInitials) {
        throw new Error("Missing required data for logging retorques.");
      }

      // 30m Check
      await addDoc(retorqueCol, {
        vehicleReg: vehicle.reg,
        positionId: posId,
        fitmentDate: fitDateStr,
        dueDate: new Date(fitTimeMs + 30 * 60 * 1000).toISOString(),
        status: 'Pending',
        type: '30m Check',
        torqueSpec: spec.torque || 0,
        fitter: fitterInitials,
        reason: reason || 'Unknown'
      });

      // 24h Check
      await addDoc(retorqueCol, {
        vehicleReg: vehicle.reg,
        positionId: posId,
        fitmentDate: fitDateStr,
        dueDate: new Date(fitTimeMs + 24 * 60 * 60 * 1000).toISOString(),
        status: 'Pending',
        type: '24h Check',
        torqueSpec: spec.torque || 0,
        fitter: fitterInitials,
        reason: reason || 'Unknown'
      });
      return true;
    } catch (e) {
      console.error("Error creating logs:", e);
      alert(`Error generating retorque tasks: ${e.message}`);
      return false;
    }
  };

  // BATCH FITMENT FUNCTION
  // Handles multiple fitments and DEDUPLICATES retorque tasks by Hub
  const fitTyreBatch = async (fitmentDataList) => {
    try {
      const batch = writeBatch(db);
      const vehicleUpdates = {};
      const historyLog = [];
      
      // 1. Process Updates
      for (const item of fitmentDataList) {
          const { vehicle, positionId, newTyre, fitDateStr, fitterInitials, isRefit, refitReason } = item;
          const vRef = doc(db, 'artifacts', appId, 'public', 'data', 'vehicles', vehicle.id);
          
          // Initialize vehicle update tracker if not present
          if (!vehicleUpdates[vehicle.id]) {
             vehicleUpdates[vehicle.id] = { ...vehicle.wheels };
          }
          
          const existingTyre = vehicleUpdates[vehicle.id][positionId];

          // Archive Old Tyre (if exists)
          if (existingTyre && existingTyre.id) {
             // In batch, we assume delete/move ops are handled individually or ignored for simplicity in UI, 
             // but here we should mark old inv as deleted if possible. 
             // Since we can't easily query within a batch loop without reads, we will just create the 'Removed' record.
             const removedRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'removed_tyres'));
             batch.set(removedRef, {
                ...existingTyre,
                removedDate: fitDateStr,
                removedFrom: vehicle.reg,
                removedPosition: positionId
             });
             // Attempt to delete old inventory record if we have ID
             const oldInvRef = doc(db, 'artifacts', appId, 'public', 'data', 'inventory', existingTyre.id);
             batch.delete(oldInvRef);
          }

          // Prepare New Tyre Record
          let tyreRecord = newTyre;
          if (isRefit) {
             // Use existing data as base
             tyreRecord = { 
                 ...existingTyre, 
                 dateFitted: fitDateStr, 
                 fitter: fitterInitials,
                 // Ensure basics exist if legacy
                 id: existingTyre?.id || generateId(),
                 barcode: existingTyre?.barcode || 'LEGACY',
                 brand: existingTyre?.brand || 'Legacy',
                 model: existingTyre?.model || '-',
                 size: existingTyre?.size || '-',
                 dot: existingTyre?.dot || ''
             };
          } else {
             // Standard Fit
             tyreRecord = { ...newTyre, dateFitted: fitDateStr, fitter: fitterInitials, vehicleId: vehicle.id, positionId, vehicleReg: vehicle.reg };
             // Update inventory status
             const invRef = doc(db, 'artifacts', appId, 'public', 'data', 'inventory', newTyre.id);
             batch.update(invRef, { status: 'Fitted', vehicleId: vehicle.id, positionId, vehicleReg: vehicle.reg });
          }

          // Update Wheels Map in Memory
          vehicleUpdates[vehicle.id][positionId] = tyreRecord;
          
          // Add History
          const histRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'history'));
          batch.set(histRef, {
             fitDate: fitDateStr,
             barcode: tyreRecord.barcode,
             brand: tyreRecord.brand,
             model: tyreRecord.model,
             size: tyreRecord.size,
             dot: tyreRecord.dot,
             vehicleReg: vehicle.reg,
             position: positionId,
             fitter: fitterInitials,
             reason: isRefit ? `Refit: ${refitReason}` : 'Tyre Fitted'
          });
      }

      // Apply Vehicle Wheel Updates
      Object.keys(vehicleUpdates).forEach(vid => {
         const vRef = doc(db, 'artifacts', appId, 'public', 'data', 'vehicles', vid);
         batch.update(vRef, { wheels: vehicleUpdates[vid] });
      });

      // 2. Generate Retorques (Deduplicated by Hub)
      const hubsProcessed = new Set();
      const retorqueCol = collection(db, 'artifacts', appId, 'public', 'data', 'retorques');

      for (const item of fitmentDataList) {
          const { vehicle, positionId, fitDateStr, fitterInitials, isRefit, refitReason } = item;
          const hubId = getHubId(positionId);
          const uniqueKey = `${vehicle.id}_${hubId}`; // e.g. v1_RL

          if (!hubsProcessed.has(uniqueKey)) {
             hubsProcessed.add(uniqueKey);
             
             // Get Spec
             const axleGroup = getAxleGroup(positionId);
             const spec = vehicle.specs[axleGroup] || { torque: 0 };
             const fitTimeMs = new Date(fitDateStr).getTime();
             const reason = isRefit ? `Refit: ${refitReason}` : 'Tyre Fitted';

             // 30m
             const r30 = doc(retorqueCol);
             batch.set(r30, {
                vehicleReg: vehicle.reg,
                positionId: hubId, // Use Hub ID for retorque
                fitmentDate: fitDateStr,
                dueDate: new Date(fitTimeMs + 30 * 60 * 1000).toISOString(),
                status: 'Pending',
                type: '30m Check',
                torqueSpec: spec.torque || 0,
                fitter: fitterInitials,
                reason
             });

             // 24h
             const r24 = doc(retorqueCol);
             batch.set(r24, {
                vehicleReg: vehicle.reg,
                positionId: hubId,
                fitmentDate: fitDateStr,
                dueDate: new Date(fitTimeMs + 24 * 60 * 60 * 1000).toISOString(),
                status: 'Pending',
                type: '24h Check',
                torqueSpec: spec.torque || 0,
                fitter: fitterInitials,
                reason
             });
          }
      }

      await batch.commit();
      alert("Batch fitment complete!");

    } catch (e) {
      console.error("Batch Error", e);
      alert("Batch fitment failed: " + e.message);
    }
  };

  // KEEPING SINGLE ACTIONS FOR BACKWARD COMPATIBILITY & UI
  const fitTyre = async (vehicleId, positionId, tyreBarcode, fitDateStr, fitterInitials) => {
    const newTyre = inventory.find(t => t.barcode === tyreBarcode && t.status === 'In Stock');
    if (!newTyre) { alert("Tyre not found!"); return; }
    const vehicle = vehicles.find(v => v.id === vehicleId);
    
    // Use Batch Logic for consistency
    await fitTyreBatch([{
       vehicle,
       positionId,
       newTyre,
       fitDateStr,
       fitterInitials,
       isRefit: false
    }]);
  };

  const refitTyre = async (vehicleId, positionId, reason, fitDateStr, fitterInitials) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    
    await fitTyreBatch([{
       vehicle,
       positionId,
       newTyre: null, // ignored in refit logic inside batch
       fitDateStr,
       fitterInitials,
       isRefit: true,
       refitReason: reason
    }]);
  };

  const disposeRemovedTyre = async (id) => {
    if(confirm("Permanently dispose of this tyre record?")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'removed_tyres', id));
    }
  };

  const pendingRetorques = retorqueRegister.filter(r => r.status === 'Pending').length;

  if (authError) return <div className="text-center p-10 text-red-500">{authError}</div>;
  if (!firebaseUser) return <div className="min-h-screen flex items-center justify-center text-slate-500">Connecting...</div>;
  if (!currentUser) return <LoginScreen users={users} onLogin={setCurrentUser} />;

  const canManageStock = ['Admin', 'Manager'].includes(currentUser.role);
  const canViewReports = ['Admin', 'Manager'].includes(currentUser.role);
  const canFitTyres = ['Admin', 'Fitter'].includes(currentUser.role); 
  const canAccessSettings = currentUser.role === 'Admin';
  const canReorder = currentUser.role === 'Admin';

  return (
    <>
      <style>{styles}</style>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <div className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-50">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <h1 className="text-xl font-bold flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg"><Truck className="w-6 h-6 text-white" /></div>
              CLion Workshop <span className="text-blue-400 font-light">Tyre Tracker</span>
            </h1>
            <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                <div className="text-sm font-bold text-white">{currentUser.initials}</div>
                <div className="text-xs text-slate-400 uppercase">{currentUser.role}</div>
              </div>
              <button onClick={() => setCurrentUser(null)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white" title="Logout">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="max-w-6xl mx-auto mt-4">
            <nav className="flex bg-slate-800 p-1 rounded-lg overflow-x-auto">
              <NavBtn label="Vehicles" icon={Truck} active={activeTab === 'vehicles'} onClick={() => setActiveTab('vehicles')} />
              {canFitTyres && <NavBtn label="Fit Tyre" icon={Wrench} active={activeTab === 'fit'} onClick={() => setActiveTab('fit')} />}
              <NavBtn label="Inventory" icon={ClipboardList} active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
              <NavBtn label="Retorques" icon={AlertTriangle} active={activeTab === 'retorque'} onClick={() => setActiveTab('retorque')} badge={pendingRetorques} />
              {canViewReports && <NavBtn label="Removed" icon={Trash2} active={activeTab === 'removed'} onClick={() => setActiveTab('removed')} />}
              {canViewReports && <NavBtn label="Reports" icon={FileSpreadsheet} active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />}
              {canAccessSettings && <NavBtn label="Settings" icon={Settings} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />}
            </nav>
          </div>
        </div>

        <main className="max-w-6xl mx-auto p-4 md:p-6 animate-enter">
          {activeTab === 'vehicles' && <VehicleManager vehicles={vehicles} onAdd={addVehicle} onUpdate={updateVehicle} onDelete={deleteVehicle} onReorder={updateVehicleOrder} canReorder={canReorder} retorqueRegister={retorqueRegister} />}
          {activeTab === 'fit' && canFitTyres && <FitmentWorkflow vehicles={vehicles} inventory={inventory} onFit={fitTyre} onRefit={refitTyre} onReorder={updateVehicleOrder} canReorder={canReorder} currentUser={currentUser} onFitBatch={fitTyreBatch} />}
          {activeTab === 'inventory' && <InventoryManager inventory={inventory} onAddBatch={addBatchStock} onDelete={deleteInventoryItem} availableSizes={availableSizes} canAdd={canManageStock} />}
          {activeTab === 'retorque' && <RetorqueManager tasks={retorqueRegister} onComplete={completeRetorque} />}
          {activeTab === 'removed' && canViewReports && <RemovedTyresManager removedTyres={removedTyres} onDispose={disposeRemovedTyre} onRestock={restockRemovedTyre} />}
          {activeTab === 'reports' && canViewReports && <ReportsManager history={fitmentHistory} retorques={retorqueRegister} />}
          {activeTab === 'settings' && canAccessSettings && <SettingsManager sizes={availableSizes} onAddSize={addSize} onRemoveSize={removeSize} onSeed={seedDatabase} users={users} onAddUser={addUser} onRemoveUser={removeUser} onRequestNotifications={requestNotificationPermission} onWipe={wipeOperationalData} />}
        </main>
      </div>
    </>
  );
}

// ... LoginScreen, VehicleManager ...
// Reusing previously defined components that haven't changed logic
function LoginScreen({ users, onLogin }) {
  const [initials, setInitials] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [truckClicks, setTruckClicks] = useState(0);
  const [showEasterEgg, setShowEasterEgg] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    if (users.length === 0 && initials === 'ADM' && pin === '0000') {
      onLogin({ initials: 'ADM', role: 'Admin' });
      return;
    }
    const user = users.find(u => u.initials.toUpperCase() === initials.toUpperCase() && u.pin === pin);
    if (user) {
      onLogin(user);
    } else {
      setError('Invalid Credentials');
    }
  };

  const handleTruckClick = () => {
    playTruckHorn(); // Beep Beep!
    const newCount = truckClicks + 1;
    setTruckClicks(newCount);
    if (newCount === 10) {
      setShowEasterEgg(true);
      setTruckClicks(0);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        {showEasterEgg && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 animate-enter" onClick={() => setShowEasterEgg(false)}>
            <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm text-center border-4 border-red-500 transform scale-110">
              <div className="text-6xl mb-4">🖍️</div>
              <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase">Message for Dick</h3>
              <p className="text-xl font-bold text-red-600 leading-tight">"Put the crayons down and ask for help!"</p>
              <button onClick={(e) => { e.stopPropagation(); setShowEasterEgg(false); }} className="mt-6 bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors">Okay, Sorry</button>
            </div>
          </div>
        )}
        <div className="glass-panel p-8 rounded-2xl shadow-2xl w-full max-w-md animate-enter">
          <div className="text-center mb-8">
            <div onClick={handleTruckClick} className="bg-blue-600 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30 cursor-pointer active:scale-90 transition-transform select-none">
              <Truck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black text-slate-800">CLion Workshop</h1>
            <p className="text-slate-500 font-medium">Tyre Tracking System</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Initials</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input autoFocus className="w-full pl-10 p-3 border-2 border-slate-200 rounded-xl bg-slate-50 uppercase font-bold tracking-widest text-center focus:border-blue-500 focus:outline-none focus:bg-white transition-all" maxLength={3} value={initials} onChange={e => setInitials(e.target.value.toUpperCase())} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">PIN</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input type="password" className="w-full pl-10 p-3 border-2 border-slate-200 rounded-xl bg-slate-50 text-center font-bold tracking-widest focus:border-blue-500 focus:outline-none focus:bg-white transition-all" maxLength={4} value={pin} onChange={e => setPin(e.target.value)} />
              </div>
            </div>
            {error && <div className="text-red-500 text-sm text-center font-bold bg-red-50 p-2 rounded-lg">{error}</div>}
            <button className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all">LOGIN</button>
          </form>
        </div>
      </div>
    </>
  );
}

function VehicleManager({ vehicles, onAdd, onUpdate, onDelete, onReorder, canReorder, retorqueRegister }) {
  // ... (Reusing existing VehicleManager code) ...
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedWheelId, setSelectedWheelId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [newVehicle, setNewVehicle] = useState({ reg: '', type: 'Van', layout: '2-axle-dual', color: 'white' });
  const [reorderMode, setReorderMode] = useState(false);
  const [localVehicles, setLocalVehicles] = useState(vehicles);
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);

  useEffect(() => { if (draggedItemIndex === null) setLocalVehicles(vehicles); }, [vehicles, draggedItemIndex]);

  const getDefaultSpecs = (layout) => {
    const hgv = { torque: 600, pressure: 120 };
    const van = { torque: 180, pressure: 55 };
    if(layout.includes('van') || layout === '2-axle-single') return { front: van, rear: van };
    if(layout === '3-axle-rigid') return { front: hgv, drive: hgv, tag: hgv };
    if(layout === '3-axle-rear-steer') return { front: hgv, drive: hgv, rear_steer: hgv };
    return { front: hgv, rear: hgv };
  };

  const handleAdd = (e) => { e.preventDefault(); onAdd({ ...newVehicle, specs: getDefaultSpecs(newVehicle.layout) }); setIsAdding(false); setNewVehicle({ reg: '', type: 'Van', layout: '2-axle-dual', color: 'white' }); };
  const startEdit = (v) => { setEditingVehicle({ ...v }); setSelectedVehicle(null); };
  const saveEdit = () => { onUpdate(editingVehicle); setEditingVehicle(null); };
  const updateSpec = (axle, field, val) => { setEditingVehicle({ ...editingVehicle, specs: { ...editingVehicle.specs, [axle]: { ...editingVehicle.specs[axle], [field]: parseInt(val) || 0 } } }); };

  const handleDragStart = (index) => setDraggedItemIndex(index);
  const handleDragEnter = (index) => { if (draggedItemIndex === null || draggedItemIndex === index) return; const newOrder = [...localVehicles]; const draggedItem = newOrder[draggedItemIndex]; newOrder.splice(draggedItemIndex, 1); newOrder.splice(index, 0, draggedItem); setDraggedItemIndex(index); setLocalVehicles(newOrder); };
  const handleDragEnd = () => { setDraggedItemIndex(null); if (onReorder) onReorder(localVehicles); };

  const wheelData = selectedVehicle && selectedWheelId ? { id: selectedWheelId, axleGroup: getAxleGroup(selectedWheelId), spec: selectedVehicle.specs[getAxleGroup(selectedWheelId)], tyre: selectedVehicle.wheels[selectedWheelId] } : null;

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-1 space-y-4">
        <div className="flex justify-between items-center"><h2 className="text-xl font-bold text-slate-800">Fleet List</h2><div className="flex gap-2">{canReorder && <button onClick={() => setReorderMode(!reorderMode)} className={`p-2 rounded-lg transition ${reorderMode ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500 hover:text-slate-700'}`} title="Toggle Reorder Mode"><ArrowUpDown className="w-5 h-5" /></button>}<button onClick={() => setIsAdding(!isAdding)} className="p-2 bg-blue-100 text-blue-700 rounded-lg btn-press"><Plus className="w-5 h-5" /></button></div></div>
        {isAdding && <form onSubmit={handleAdd} className="bg-white p-4 rounded-xl shadow space-y-3 animate-enter"><input required placeholder="Reg" className="w-full p-2 border rounded" value={newVehicle.reg} onChange={e => setNewVehicle({...newVehicle, reg: e.target.value})} /><select className="w-full p-2 border rounded" value={newVehicle.layout} onChange={e => setNewVehicle({...newVehicle, layout: e.target.value})}><option value="2-axle-dual">2 Axle (Dual Rear)</option><option value="3-axle-rear-steer">3 Axle (Rear Steer)</option><option value="3-axle-rigid">3 Axle Rigid</option><option value="2-axle-single">2 Axle (Single Rear)</option></select><button className="w-full bg-blue-600 text-white py-2 rounded">Save</button></form>}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-100 max-h-[600px] overflow-y-auto">{localVehicles.map((v, idx) => { const colorClass = getVehicleColorClasses(v.color || 'white'); return (<div key={v.id} draggable={reorderMode} onDragStart={(e) => handleDragStart(idx)} onDragEnter={(e) => handleDragEnter(idx)} onDragEnd={handleDragEnd} onDragOver={(e) => e.preventDefault()} onClick={() => { if(!reorderMode) { setSelectedVehicle(v); setSelectedWheelId(null); setEditingVehicle(null); } }} className={`p-4 cursor-pointer flex justify-between items-center transition-all duration-200 border-l-4 ${selectedVehicle?.id === v.id ? 'border-blue-500 shadow-md' : 'border-transparent'} ${colorClass.bg} ${colorClass.hover} ${reorderMode ? 'drag-item' : ''}`}><div><div className="font-bold text-lg text-slate-800">{v.reg}</div><div className="text-xs text-slate-500">{v.type}</div></div><div className="flex gap-1 items-center">{reorderMode ? <div className="text-slate-400 cursor-grab active:cursor-grabbing p-2"><GripVertical className="w-5 h-5" /></div> : <><button onClick={(e) => { e.stopPropagation(); startEdit(v); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-100/50 rounded-full transition-all"><Settings className="w-5 h-5" /></button><button onClick={(e) => { e.stopPropagation(); onDelete(v.id); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-100/50 rounded-full transition-all"><Trash2 className="w-5 h-5" /></button></>}</div></div>); })}</div>
      </div>
      <div className="md:col-span-2 relative">
        {editingVehicle ? (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col animate-enter">
            <div className="flex justify-between mb-4"><h2 className="text-xl font-bold">Configure {editingVehicle.reg}</h2><button onClick={() => setEditingVehicle(null)}><X className="w-6 h-6 text-slate-400" /></button></div>
            <div className="space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4"><input className="border p-2 rounded" value={editingVehicle.reg} onChange={e => setEditingVehicle({...editingVehicle, reg: e.target.value})} /><input className="border p-2 rounded" value={editingVehicle.type} onChange={e => setEditingVehicle({...editingVehicle, type: e.target.value})} /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">Color Tag</label><div className="flex gap-2 flex-wrap">{VEHICLE_COLORS.map(c => <button key={c.id} type="button" onClick={() => setEditingVehicle({...editingVehicle, color: c.id})} className={`w-8 h-8 rounded-full border-2 transition-all ${c.bg} ${editingVehicle.color === c.id ? 'border-blue-600 scale-110 shadow' : 'border-transparent hover:scale-105'}`} title={c.label}/>)}</div></div>
              <div className="space-y-4 border-t pt-4"><h4 className="font-bold text-slate-700">Axle Specs</h4>{Object.keys(editingVehicle.specs).map(axle => (<div key={axle} className="bg-slate-50 p-4 rounded border"><h4 className="font-bold text-xs uppercase mb-2">{formatAxleName(axle)}</h4><div className="grid grid-cols-2 gap-4"><div><label className="text-xs text-slate-500">Torque (Nm)</label><input type="number" className="w-full border p-1 rounded font-bold" value={editingVehicle.specs[axle].torque} onChange={e => updateSpec(axle, 'torque', e.target.value)} /></div><div><label className="text-xs text-slate-500">Pressure (PSI)</label><input type="number" className="w-full border p-1 rounded font-bold" value={editingVehicle.specs[axle].pressure} onChange={e => updateSpec(axle, 'pressure', e.target.value)} /></div></div></div>))}</div>
            </div>
            <div className="mt-4 pt-4 border-t text-right"><button onClick={saveEdit} className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 ml-auto btn-press"><Save className="w-4 h-4"/> Save Changes</button></div>
          </div>
        ) : selectedVehicle ? (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col animate-enter">
            <div className="mb-4 border-b pb-4 flex justify-between items-start"><div><h2 className="text-2xl font-black text-slate-800">{selectedVehicle.reg}</h2><p className="text-slate-500 font-medium">{selectedVehicle.type}</p></div><div className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">View Mode</div></div>
            <div className="flex-1 relative min-h-[400px]">
              <VehicleFrog vehicle={selectedVehicle} retorques={retorqueRegister} mode="view" onSelect={setSelectedWheelId} />
              {wheelData && (
                <div className="absolute top-10 right-0 md:right-10 w-72 bg-slate-900/95 text-white p-5 rounded-xl shadow-2xl z-20 backdrop-blur-md animate-enter border border-slate-700">
                  <div className="flex justify-between mb-4"><h3 className="font-bold text-lg text-blue-400">{formatPosition(wheelData.id)}</h3><button onClick={() => setSelectedWheelId(null)} className="hover:text-red-400 transition-colors"><X className="w-5 h-5"/></button></div>
                  <div className="space-y-4">
                    <div className="bg-slate-800/50 p-3 rounded-lg text-center grid grid-cols-2 gap-4 border border-slate-700"><div><div className="text-xs text-slate-400 uppercase tracking-wider">Torque</div><div className="font-bold text-xl font-mono">{wheelData.spec?.torque}</div></div><div><div className="text-xs text-slate-400 uppercase tracking-wider">Pressure</div><div className="font-bold text-xl font-mono">{wheelData.spec?.pressure}</div></div></div>
                    {wheelData.tyre ? (
                      <div className="text-sm space-y-1"><div className="font-bold border-b border-slate-700 pb-2 mb-2 text-xs uppercase tracking-wider text-slate-400">FITTED TYRE</div><div className="font-bold text-lg">{wheelData.tyre.brand}</div><div className="text-slate-300">{wheelData.tyre.model}</div><div className="text-slate-400 text-xs">{wheelData.tyre.size}</div><div className="bg-black/30 p-2 rounded text-center font-mono text-xs mt-3 tracking-widest text-emerald-400 border border-emerald-900/50">{wheelData.tyre.barcode}</div><div className="grid grid-cols-2 gap-2 mt-4 text-xs pt-2 border-t border-slate-800"><div><span className="block text-slate-500 mb-0.5">Age</span><span className="text-blue-300 font-bold">{calculateAge(wheelData.tyre.dot)}</span></div><div><span className="block text-slate-500 mb-0.5">Fitter</span><span className="text-white font-bold">{wheelData.tyre.fitter || '-'}</span></div><div className="col-span-2 mt-1"><span className="block text-slate-500 mb-0.5">Date Fitted</span><span className="text-emerald-400 font-medium flex items-center gap-1"><Calendar className="w-3 h-3"/> {new Date(wheelData.tyre.dateFitted).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span></div></div></div>
                    ) : <div className="text-center text-slate-500 py-6 border-2 border-dashed border-slate-700 rounded-lg">Empty Position</div>}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100/50 rounded-xl border-2 border-dashed border-slate-200 p-10"><Truck className="w-16 h-16 mb-4 opacity-50" /><p>Select a vehicle from the list to view details.</p></div>}
      </div>
    </div>
  );
}

function FitmentWorkflow({ vehicles, inventory, onFitBatch, currentUser }) {
  const [step, setStep] = useState(1);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  
  // Batch Queue
  const [scanQueue, setScanQueue] = useState([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [collectedData, setCollectedData] = useState([]);
  
  // Current Scan Step Form
  const [mode, setMode] = useState('Scan');
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [refitReason, setRefitReason] = useState('Brake Work');
  const [customReason, setCustomReason] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  
  // Global settings for batch
  const [fitterInitials, setFitterInitials] = useState(currentUser.initials);
  const [fitDate, setFitDate] = useState(new Date().toISOString().slice(0, 16));

  // Search
  const [searchFilter, setSearchFilter] = useState('');

  const displayedVehicles = vehicles.filter(v => v.reg.toUpperCase().includes(searchFilter.toUpperCase()));

  const startScanFlow = (queueList) => {
    setScanQueue(queueList);
    setCurrentQueueIndex(0);
    setCollectedData([]);
    setStep(3); // Go to scan screen
  };

  const handleScan = () => {
    if (!('BarcodeDetector' in window)) {
      alert("Barcode Detector API not supported. Please type manually.");
      return;
    }
    setShowCamera(true);
  };

  useEffect(() => {
    let stream = null;
    let interval = null;
    if (showCamera) {
      const barcodeDetector = new window.BarcodeDetector({ formats: ['code_128', 'ean_13', 'code_39'] });
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(s => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
            interval = setInterval(async () => {
              try {
                if (videoRef.current && videoRef.current.readyState === 4) {
                  const barcodes = await barcodeDetector.detect(videoRef.current);
                  if (barcodes.length > 0) {
                    setScannedBarcode(barcodes[0].rawValue);
                    setShowCamera(false);
                  }
                }
              } catch (e) {}
            }, 200);
          }
        })
        .catch(() => setShowCamera(false));
    }
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (interval) clearInterval(interval);
    };
  }, [showCamera]);

  const confirmSingleItem = () => {
    const currentPos = scanQueue[currentQueueIndex];
    let newTyre = null;

    if (mode === 'Scan') {
       if (!scannedBarcode) return;
       newTyre = inventory.find(t => t.barcode === scannedBarcode && t.status === 'In Stock');
       if (!newTyre) {
         alert("Tyre not found in stock!");
         return;
       }
    } else {
       // Refit mode validation
       const reason = refitReason === 'Other' ? customReason : refitReason;
       if (!reason) return;
    }

    const nextData = [...collectedData, {
       vehicle: selectedVehicle,
       positionId: currentPos.pos || currentPos, // Handle object or string
       newTyre: newTyre,
       fitDateStr: fitDate,
       fitterInitials,
       isRefit: mode === 'Refit',
       refitReason: mode === 'Refit' ? (refitReason === 'Other' ? customReason : refitReason) : null
    }];
    
    setCollectedData(nextData);
    setScannedBarcode('');
    // Keep mode/reason/camera settings for next item or reset? 
    // Usually easier to keep mode unless user changes it.

    if (currentQueueIndex + 1 < scanQueue.length) {
       setCurrentQueueIndex(currentQueueIndex + 1);
    } else {
       // All done, submit batch
       onFitBatch(nextData);
       // Reset
       setStep(1); setSelectedVehicle(null); setScanQueue([]); setCollectedData([]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <StepIndicator num={1} label="Vehicle" active={step >= 1} />
        <div className="h-1 flex-1 bg-slate-100 mx-4"><div className={`h-full bg-blue-600 transition-all duration-500 ease-out ${step >= 2 ? 'w-full' : 'w-0'}`} /></div>
        <StepIndicator num={2} label="Positions" active={step >= 2} />
        <div className="h-1 flex-1 bg-slate-100 mx-4"><div className={`h-full bg-blue-600 transition-all duration-500 ease-out ${step >= 3 ? 'w-full' : 'w-0'}`} /></div>
        <StepIndicator num={3} label="Scan" active={step >= 3} />
      </div>

      <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 min-h-[400px] animate-enter">
        {step === 1 && (
          <div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input placeholder="Search Registration..." className="w-full pl-10 p-3 border rounded-xl bg-slate-50 focus:border-blue-500 focus:bg-white transition-colors" value={searchFilter} onChange={e => setSearchFilter(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {displayedVehicles.map((v) => {
                 const colorClass = getVehicleColorClasses(v.color || 'white');
                 return (
                  <button key={v.id} onClick={() => { setSelectedVehicle(v); setStep(2); }} className={`w-full p-2 text-left border-2 rounded-xl transition-all duration-200 btn-press h-full flex flex-col justify-between min-h-[80px] ${colorClass.bg} ${colorClass.border} ${colorClass.hover} hover:shadow-md`}>
                    <div className="font-bold text-base text-slate-800 leading-tight">{v.reg}</div>
                    <div className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">{v.type}</div>
                  </button>
                 );
              })}
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="text-center animate-enter">
            <h3 className="font-bold mb-6 text-lg">Select Position(s) to Fit</h3>
            <VehicleFrog 
              vehicle={selectedVehicle} 
              mode="select" 
              onSelect={(selection) => {
                 // Selection can be { type: 'single', pos: 'FL' } or { type: 'dual', positions: ['RLI', 'RLO'] } etc
                 if (selection.type === 'single') startScanFlow([selection.pos]);
                 else if (selection.type === 'dual' || selection.type === 'axle') startScanFlow(selection.positions);
                 else startScanFlow([selection]); // Fallback for simple string
              }} 
            />
            <button onClick={() => setStep(1)} className="mt-8 text-slate-400 hover:text-blue-600 underline transition-colors">Back to Vehicles</button>
          </div>
        )}
        {step === 3 && (
          <div className="max-w-md mx-auto space-y-6 animate-enter">
            <div className="text-center mb-6">
               <h3 className="text-xl font-bold">{selectedVehicle.reg}</h3>
               <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-bold mt-2 inline-flex items-center gap-2">
                 <span>Scanning {currentQueueIndex + 1} of {scanQueue.length}:</span>
                 <span className="uppercase">{formatPosition(scanQueue[currentQueueIndex])}</span>
               </div>
            </div>

            {/* Mode Selection */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button 
                className={`flex-1 py-2 rounded-md text-sm font-bold transition-all duration-200 ${mode === 'Scan' ? 'bg-white shadow text-blue-600 scale-100' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => setMode('Scan')}
              >
                Fit New Tyre
              </button>
              <button 
                className={`flex-1 py-2 rounded-md text-sm font-bold transition-all duration-200 ${mode === 'Refit' ? 'bg-white shadow text-blue-600 scale-100' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => setMode('Refit')}
              >
                Refit Removed Tyre
              </button>
            </div>

            <div className="space-y-4">
              <input type="datetime-local" value={fitDate} onChange={e => setFitDate(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-lg text-sm" />
              
              {mode === 'Scan' ? (
                <>
                  <div className="flex gap-2">
                    <input value={scannedBarcode} onChange={e => setScannedBarcode(e.target.value)} className="flex-1 p-3 border-2 border-slate-200 rounded-lg font-mono text-lg" placeholder="Scan Barcode" autoFocus />
                    <button onClick={handleScan} className="bg-slate-200 px-4 rounded-lg hover:bg-slate-300" title="Open Camera"><Camera className="w-6 h-6 text-slate-700" /></button>
                  </div>
                  {showCamera && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
                       <div className="relative w-full max-w-sm bg-black rounded-xl overflow-hidden shadow-2xl">
                         <video ref={videoRef} className="w-full h-auto" />
                         <button onClick={() => setShowCamera(false)} className="absolute top-4 right-4 bg-white/20 p-2 rounded-full text-white"><X className="w-6 h-6"/></button>
                       </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-600">Reason for Removal</label>
                  <select 
                    className="w-full p-3 border-2 border-slate-200 rounded-lg bg-white focus:border-blue-500 focus:outline-none"
                    value={refitReason}
                    onChange={(e) => setRefitReason(e.target.value)}
                  >
                    <option value="Brake Work">Brake Work</option>
                    <option value="Turn on Rim">Turn on Rim</option>
                    <option value="Other">Other...</option>
                  </select>
                  {refitReason === 'Other' && (
                    <input 
                      placeholder="Specify reason..." 
                      className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                      value={customReason}
                      onChange={e => setCustomReason(e.target.value)}
                    />
                  )}
                </div>
              )}
              
              <input value={fitterInitials} readOnly className="w-full p-3 border-2 border-slate-200 rounded text-center uppercase tracking-widest font-bold bg-slate-100 text-slate-500" />
            </div>

            <button onClick={confirmSingleItem} disabled={mode === 'Scan' && !scannedBarcode} className="w-full bg-green-600 text-white p-4 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 shadow-lg btn-press transition-all">
              {currentQueueIndex + 1 === scanQueue.length ? 'FINISH & SUBMIT' : 'NEXT TYRE'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ... InventoryManager, RetorqueManager, RemovedTyresManager, ReportsManager, SettingsManager ...
// No logic changes needed there, just reusing previous valid code structure.
// I will include them to ensure the file is complete and compilable.

function InventoryManager({ inventory, onAddBatch, onDelete, availableSizes, canAdd }) {
  const [form, setForm] = useState({ brand: '', model: '', size: availableSizes[0]?.name || '', qty: 1, dot: '', isUsed: false, treadDepth: '' });
  const [filter, setFilter] = useState('');
  const [printItem, setPrintItem] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');

  const { items: sortedInventory, requestSort, sortConfig } = useSortableData(
    inventory.filter(t => {
      const matchesSearch = t.barcode.includes(filter) || t.brand.toLowerCase().includes(filter.toLowerCase()) || t.size.includes(filter);
      const matchesStatus = statusFilter === 'All' 
        ? true 
        : statusFilter === 'Fitted' 
          ? t.status === 'Fitted' 
          : t.status === 'In Stock';
      return matchesSearch && matchesStatus;
    })
  );

  const handleAdd = (e) => {
    e.preventDefault();
    onAddBatch({ 
      brand: form.brand, 
      model: form.model, 
      size: form.size, 
      dot: form.dot,
      isUsed: form.isUsed,
      treadDepth: form.isUsed ? form.treadDepth : null
    }, parseInt(form.qty));
    setForm({ ...form, qty: 1, dot: '', isUsed: false, treadDepth: '' });
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Label</title>
          <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39+Text&display=swap" rel="stylesheet">
          <style>
            body { font-family: sans-serif; text-align: center; padding: 20px; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .label { border: 2px solid black; padding: 20px; width: 300px; height: 450px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; }
            .barcode { font-family: 'Libre Barcode 39 Text', cursive; font-size: 48px; margin: 10px 0; }
            .meta { font-size: 14px; font-weight: bold; }
            .brand { font-size: 28px; font-weight: 900; text-transform: uppercase; }
            .model { font-size: 18px; margin-bottom: 10px; }
            .size { font-size: 32px; font-weight: bold; border: 2px solid black; padding: 5px 15px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="label">
            <div>
              <div class="brand">${printItem.brand}</div>
              <div class="model">${printItem.model}</div>
            </div>
            <div class="size">${printItem.size}</div>
            <div class="barcode">*${printItem.barcode}*</div>
            <div class="meta">
              <div>S/N: ${printItem.barcode}</div>
              <div style="margin-top:5px">DOT: ${printItem.dot}</div>
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-8 animate-enter">
      {canAdd && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-green-600" /> Batch Add Stock</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-2 md:grid-cols-6 gap-4 items-end">
            <div className="col-span-1"><input required placeholder="Brand" className="p-2 border rounded w-full" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} /></div>
            <div className="col-span-1"><input required placeholder="Model" className="p-2 border rounded w-full" value={form.model} onChange={e => setForm({...form, model: e.target.value})} /></div>
            <div className="col-span-1"><select required className="p-2 border rounded w-full bg-white" value={form.size} onChange={e => setForm({...form, size: e.target.value})}>{availableSizes.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select></div>
            <div className="col-span-1"><input required placeholder="DOT (e.g 1024)" maxLength="4" className="p-2 border rounded w-full" value={form.dot} onChange={e => setForm({...form, dot: e.target.value})} /></div>
            <div className="col-span-1"><input type="number" min="1" max="50" required placeholder="Qty" className="p-2 border rounded w-full" value={form.qty} onChange={e => setForm({...form, qty: e.target.value})} /></div>
            <div className="col-span-1 flex flex-col gap-2"><label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none"><input type="checkbox" checked={form.isUsed} onChange={e => setForm({...form, isUsed: e.target.checked})} /> Used Tyre?</label>{form.isUsed && (<input type="number" placeholder="Depth (mm)" className="p-1 border rounded text-xs w-full animate-enter" value={form.treadDepth} onChange={e => setForm({...form, treadDepth: e.target.value})} required />)}</div>
            <button className="col-span-2 md:col-span-6 bg-slate-900 text-white rounded font-medium py-2 mt-2 hover:bg-slate-800 btn-press transition-all">Add</button>
          </form>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 bg-slate-50 border-b flex flex-col md:flex-row justify-between items-center gap-4">
          <h3 className="font-bold text-slate-700">Serialized Inventory</h3>
          <div className="flex gap-2 w-full md:w-auto">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border p-2 rounded text-sm bg-white"><option value="All">All Status</option><option value="In Stock">In Stock</option><option value="Fitted">Fitted</option></select>
            <div className="relative flex-1 md:flex-none"><Search className="absolute left-2 top-2 w-4 h-4 text-slate-400"/><input placeholder="Search..." className="pl-8 p-2 border rounded text-sm w-full" value={filter} onChange={e=>setFilter(e.target.value)}/></div>
          </div>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50"><tr><SortableHeader label="Barcode" sortKey="barcode" requestSort={requestSort} sortConfig={sortConfig} /><SortableHeader label="Details" sortKey="brand" requestSort={requestSort} sortConfig={sortConfig} /><SortableHeader label="Age" sortKey="dot" requestSort={requestSort} sortConfig={sortConfig} /><SortableHeader label="Status" sortKey="status" requestSort={requestSort} sortConfig={sortConfig} /><th className="p-3 text-right">Actions</th></tr></thead>
          <tbody className="divide-y">{sortedInventory.map(t => (<tr key={t.id} className="hover:bg-slate-50 transition-colors"><td className="p-3 font-mono font-bold">{t.barcode}</td><td className="p-3"><div className="font-medium text-slate-900">{t.brand} {t.model}</div><div className="text-xs text-slate-500">{t.size}</div>{t.isUsed && <span className="inline-block bg-amber-100 text-amber-800 text-[10px] px-1 rounded border border-amber-200 mt-1">Used: {t.treadDepth}mm</span>}</td><td className="p-3"><div className="text-xs font-bold text-slate-600">{calculateAge(t.dot)}</div><div className="text-xs text-slate-400">DOT: {t.dot}</div></td><td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${t.status==='In Stock'?'bg-green-100 text-green-700':'bg-slate-100 text-slate-500'}`}>{t.status}</span>{t.status==='Fitted' && <div className="text-xs mt-1 text-slate-500 font-medium">{t.vehicleReg}</div>}</td><td className="p-3 text-right"><div className="flex justify-end gap-2"><button onClick={()=>setPrintItem(t)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all" title="Print Label"><Printer className="w-4 h-4"/></button>{canAdd && <button onClick={()=>onDelete(t.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all" title="Delete Stock"><Trash2 className="w-4 h-4"/></button>}</div></td></tr>))}</tbody>
        </table>
      </div>
      {printItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 text-center">
            <h3 className="font-bold text-xl mb-4">{printItem.brand}</h3><div className="font-mono text-3xl font-black bg-slate-100 p-4 mb-4">{printItem.barcode}</div><div className="flex gap-2"><button onClick={()=>setPrintItem(null)} className="flex-1 py-2 border rounded">Cancel</button><button onClick={handlePrint} className="flex-1 py-2 bg-blue-600 text-white rounded">Print Now</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function RetorqueManager({ tasks, onComplete }) {
  const [confirmingTask, setConfirmingTask] = useState(null);
  const historyTasks = tasks.filter(t => t.status === 'Completed');
  const { items: sortedHistory, requestSort, sortConfig } = useSortableData(historyTasks, { key: 'completedDate', direction: 'descending' });

  const handleConfirm = () => { onComplete(confirmingTask.id); setConfirmingTask(null); };

  return (
    <div className="space-y-6 animate-enter">
      <div className="space-y-4"><h3 className="font-bold text-lg flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500"/> Outstanding</h3>{tasks.filter(t=>t.status==='Pending').length===0 ? <div className="p-8 bg-green-50 text-green-800 text-center rounded-xl border border-green-100 font-medium">All compliant</div> : tasks.filter(t=>t.status==='Pending').map(t => (<div key={t.id} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-amber-500 flex justify-between items-center hover:shadow-md transition-all"><div><div className="flex gap-2 mb-1"><span className={`px-2 text-xs font-bold rounded text-white ${t.type.includes('30')?'bg-red-500':'bg-blue-500'}`}>{t.type}</span><span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 rounded">Fitter: {t.fitter}</span></div><div className="font-black text-lg text-slate-800">{t.vehicleReg}</div><div className="text-sm text-slate-500">{formatPosition(t.positionId)} <span className="text-slate-400">({t.reason})</span></div><div className="text-xs font-bold text-amber-600 mt-1">Due: {new Date(t.dueDate).toLocaleString()}</div></div><div className="text-right flex flex-col items-end gap-2"><div className="text-xs text-slate-400 font-mono bg-slate-50 px-2 py-1 rounded">Target: {t.torqueSpec} Nm</div><button onClick={()=>setConfirmingTask(t)} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-800 font-medium shadow-md flex items-center gap-2 btn-press"><CheckCircle className="w-4 h-4" /> Confirm</button></div></div>))}</div>
      <div><h3 className="font-bold text-lg mb-4 flex items-center gap-2"><History className="w-5 h-5"/> History</h3><div className="bg-white rounded-xl shadow-sm border overflow-hidden"><table className="w-full text-sm text-left"><thead className="bg-slate-50"><tr><SortableHeader label="Completed" sortKey="completedDate" requestSort={requestSort} sortConfig={sortConfig} /><SortableHeader label="Type" sortKey="type" requestSort={requestSort} sortConfig={sortConfig} /><SortableHeader label="Reason" sortKey="reason" requestSort={requestSort} sortConfig={sortConfig} /><SortableHeader label="Vehicle" sortKey="vehicleReg" requestSort={requestSort} sortConfig={sortConfig} /><SortableHeader label="Fitter" sortKey="fitter" requestSort={requestSort} sortConfig={sortConfig} /><th className="p-3 text-right">Status</th></tr></thead><tbody>{sortedHistory.map(t=>(<tr key={t.id} className="hover:bg-slate-50"><td className="p-3 text-slate-600">{new Date(t.completedDate).toLocaleDateString()}</td><td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.type.includes('30')?'bg-red-100 text-red-700':'bg-blue-100 text-blue-700'}`}>{t.type}</span></td><td className="p-3 text-slate-500 text-xs">{t.reason}</td><td className="p-3 font-bold text-slate-700">{t.vehicleReg}</td><td className="p-3 font-medium">{t.fitter}</td><td className="p-3 text-right text-green-600 font-bold text-xs">VERIFIED</td></tr>))}</tbody></table></div></div>
      {confirmingTask && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"><div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200"><div className="flex items-center gap-3 mb-4 text-amber-600"><ShieldCheck className="w-8 h-8" /><h3 className="font-bold text-xl text-slate-900">Safety Confirmation</h3></div><p className="text-slate-600 mb-6 text-sm leading-relaxed">I confirm I have performed this retorque within the specifications and no anomalies were detected during the process.</p><div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 text-sm"><div className="flex justify-between mb-2"><span className="text-slate-500">Vehicle:</span><span className="font-bold">{confirmingTask.vehicleReg}</span></div><div className="flex justify-between mb-2"><span className="text-slate-500">Position:</span><span className="font-bold">{formatPosition(confirmingTask.positionId)}</span></div><div className="flex justify-between"><span className="text-slate-500">Torque Spec:</span><span className="font-bold font-mono">{confirmingTask.torqueSpec} Nm</span></div></div><div className="flex gap-3"><button onClick={() => setConfirmingTask(null)} className="flex-1 py-3 text-slate-500 hover:bg-slate-100 rounded-lg font-medium transition">Cancel</button><button onClick={handleConfirm} className="flex-1 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-lg shadow-green-200 transition btn-press">I Certify & Confirm</button></div></div></div>)}
    </div>
  );
}

function RemovedTyresManager({ removedTyres, onDispose, onRestock }) {
  const [restockItem, setRestockItem] = useState(null);
  const [treadDepth, setTreadDepth] = useState('');
  const confirmRestock = () => { if(!treadDepth) return; onRestock(restockItem, treadDepth); setRestockItem(null); setTreadDepth(''); };

  return (
    <div className="space-y-6 bg-white p-6 rounded shadow animate-enter">
      <h3 className="font-bold text-lg flex items-center gap-2"><Trash2 className="w-5 h-5 text-red-500"/> Removed Tyres</h3>
      <div className="overflow-x-auto border rounded"><table className="w-full text-sm text-left"><thead className="bg-slate-50"><tr><th className="p-3">Removed Date</th><th className="p-3">Old Barcode</th><th className="p-3">Details</th><th className="p-3">Removed From</th><th className="p-3 text-right">Actions</th></tr></thead><tbody className="divide-y">{removedTyres.map(t => (<tr key={t.id} className="hover:bg-slate-50"><td className="p-3">{new Date(t.removedDate).toLocaleDateString()}</td><td className="p-3 font-mono text-xs text-slate-500 line-through">{t.barcode}</td><td className="p-3"><div className="font-bold">{t.brand}</div><div className="text-xs text-slate-500">{t.size}</div></td><td className="p-3"><div className="font-bold">{t.removedFrom}</div><div className="text-xs text-slate-500">{formatPosition(t.removedPosition)}</div></td><td className="p-3 text-right"><div className="flex justify-end gap-2"><button onClick={() => setRestockItem(t)} className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs font-bold transition"><Recycle className="w-3 h-3" /> Restock</button><button onClick={() => onDispose(t.id)} className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs font-bold transition"><Trash2 className="w-3 h-3" /> Dispose</button></div></td></tr>))}</tbody></table></div>
      {restockItem && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"><div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-enter"><h3 className="font-bold text-lg mb-4">Restock Tyre</h3><p className="text-sm text-slate-600 mb-4">This will generate a new barcode label and add the tyre back to stock as "Used".</p><div className="mb-4"><label className="block text-xs font-bold text-slate-500 mb-1">Measured Tread Depth (mm)</label><input type="number" autoFocus className="w-full p-2 border rounded" value={treadDepth} onChange={e => setTreadDepth(e.target.value)}/></div><div className="flex gap-2"><button onClick={() => setRestockItem(null)} className="flex-1 py-2 border rounded text-slate-500 hover:bg-slate-50">Cancel</button><button onClick={confirmRestock} className="flex-1 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 shadow-md btn-press">Confirm & Print</button></div></div></div>)}
    </div>
  );
}

function ReportsManager({ history, retorques }) {
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().slice(0,10));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0,10));
  const [reportType, setReportType] = useState('fitment');
  const [filterVehicle, setFilterVehicle] = useState('');
  const [filterFitter, setFilterFitter] = useState('');
  
  const uniqueVehicles = [...new Set([...history.map(h => h.vehicleReg), ...retorques.map(r => r.vehicleReg)])].sort();
  const uniqueFitters = [...new Set([...history.map(h => h.fitter), ...retorques.map(r => r.fitter)])].sort();
  
  const filterItem = (item, dateField) => {
    const d = item[dateField].split('T')[0];
    const matchDate = d >= dateFrom && d <= dateTo;
    const matchVeh = filterVehicle ? item.vehicleReg === filterVehicle : true;
    const matchFit = filterFitter ? item.fitter === filterFitter : true;
    return matchDate && matchVeh && matchFit;
  };

  const filteredHistory = history.filter(i => filterItem(i, 'fitDate'));
  const filteredRetorques = retorques.filter(r => filterItem(r, 'fitmentDate'));

  const { items: sortedHistory, requestSort: sortHist, sortConfig: histSort } = useSortableData(filteredHistory, { key: 'fitDate', direction: 'descending' });
  const { items: sortedRetorques, requestSort: sortRet, sortConfig: retSort } = useSortableData(filteredRetorques, { key: 'fitmentDate', direction: 'descending' });
  
  const exportCSV = () => {
    let csv = "";
    if (reportType === 'fitment') {
      csv = "Date,Barcode,Brand,Size,DOT,Vehicle,Pos,Fitter,Reason\n" + sortedHistory.map(r => `${r.fitDate},${r.barcode},${r.brand},${r.size},${r.dot},${r.vehicleReg},${formatPosition(r.position)},${r.fitter},${r.reason || 'Tyre Fitted'}`).join("\n");
    } else {
      csv = "Fitment Date,Due Date,Type,Reason,Vehicle,Position,Status,Fitter\n" + sortedRetorques.map(r => `${r.fitmentDate},${r.dueDate},${r.type},${r.reason},${r.vehicleReg},${formatPosition(r.positionId)},${r.status},${r.fitter}`).join("\n");
    }
    const link = document.createElement("a"); link.href = "data:text/csv;charset=utf-8,"+encodeURI(csv); link.download=`${reportType}_report.csv`; link.click();
  };

  return (
    <div className="space-y-6 bg-white p-6 rounded shadow animate-enter">
      <div className="flex items-center gap-4 border-b pb-4 mb-4"><h3 className="font-bold text-lg flex items-center gap-2 flex-1"><FileSpreadsheet className="w-5 h-5 text-blue-600"/> Reports</h3><div className="flex bg-slate-100 p-1 rounded-lg"><button onClick={() => setReportType('fitment')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${reportType === 'fitment' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Fitment History</button><button onClick={() => setReportType('retorque')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${reportType === 'retorque' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Retorque Logs</button></div></div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end mb-4">
        <div><label className="block text-xs font-bold text-slate-500">From</label><input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="border p-2 rounded w-full"/></div>
        <div><label className="block text-xs font-bold text-slate-500">To</label><input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="border p-2 rounded w-full"/></div>
        <div><label className="block text-xs font-bold text-slate-500">Vehicle</label><select value={filterVehicle} onChange={e=>setFilterVehicle(e.target.value)} className="border p-2 rounded w-full bg-white"><option value="">All Vehicles</option>{uniqueVehicles.map(v => <option key={v} value={v}>{v}</option>)}</select></div>
        <div><label className="block text-xs font-bold text-slate-500">Fitter</label><select value={filterFitter} onChange={e=>setFilterFitter(e.target.value)} className="border p-2 rounded w-full bg-white"><option value="">All Fitters</option>{uniqueFitters.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
        <button onClick={exportCSV} className="bg-green-600 text-white px-4 py-2 rounded flex items-center justify-center gap-2 hover:bg-green-700 shadow-md transition btn-press"><Download className="w-4 h-4"/> Export CSV</button>
      </div>
      <div className="overflow-x-auto border rounded">
        {reportType === 'fitment' ? (
          <table className="w-full text-sm text-left"><thead className="bg-slate-50"><tr><SortableHeader label="Date" sortKey="fitDate" requestSort={sortHist} sortConfig={histSort} /><SortableHeader label="Barcode" sortKey="barcode" requestSort={sortHist} sortConfig={histSort} /><SortableHeader label="Brand" sortKey="brand" requestSort={sortHist} sortConfig={histSort} /><SortableHeader label="Size" sortKey="size" requestSort={sortHist} sortConfig={histSort} /><SortableHeader label="Reason" sortKey="reason" requestSort={sortHist} sortConfig={histSort} /><SortableHeader label="Vehicle" sortKey="vehicleReg" requestSort={sortHist} sortConfig={histSort} /><SortableHeader label="Pos" sortKey="position" requestSort={sortHist} sortConfig={histSort} /><SortableHeader label="Fitter" sortKey="fitter" requestSort={sortHist} sortConfig={histSort} /></tr></thead>
            <tbody>{sortedHistory.map(r=><tr key={r.id} className="hover:bg-slate-50"><td className="p-3">{new Date(r.fitDate).toLocaleDateString()}</td><td className="p-3 font-mono">{r.barcode}</td><td className="p-3">{r.brand}</td><td className="p-3">{r.size}</td><td className="p-3 text-slate-500">{r.reason || 'Tyre Fitted'}</td><td className="p-3 font-bold">{r.vehicleReg}</td><td className="p-3">{formatPosition(r.position)}</td><td className="p-3 font-bold">{r.fitter}</td></tr>)}</tbody></table>
        ) : (
          <table className="w-full text-sm text-left"><thead className="bg-slate-50"><tr><SortableHeader label="Fit Date" sortKey="fitmentDate" requestSort={sortRet} sortConfig={retSort} /><SortableHeader label="Due Date" sortKey="dueDate" requestSort={sortRet} sortConfig={retSort} /><SortableHeader label="Type" sortKey="type" requestSort={sortRet} sortConfig={retSort} /><SortableHeader label="Reason" sortKey="reason" requestSort={sortRet} sortConfig={retSort} /><SortableHeader label="Vehicle" sortKey="vehicleReg" requestSort={sortRet} sortConfig={retSort} /><SortableHeader label="Position" sortKey="positionId" requestSort={sortRet} sortConfig={retSort} /><SortableHeader label="Status" sortKey="status" requestSort={sortRet} sortConfig={retSort} /><SortableHeader label="Completed" sortKey="completedDate" requestSort={sortRet} sortConfig={retSort} /><SortableHeader label="Fitter" sortKey="fitter" requestSort={sortRet} sortConfig={retSort} /></tr></thead>
            <tbody>{sortedRetorques.map(r=><tr key={r.id} className="hover:bg-slate-50"><td className="p-3 text-slate-500">{new Date(r.fitmentDate).toLocaleDateString()}</td><td className="p-3 font-bold">{new Date(r.dueDate).toLocaleString()}</td><td className="p-3"><span className={`px-2 py-1 rounded text-xs font-bold text-white ${r.type.includes('30') ? 'bg-blue-500' : 'bg-purple-500'}`}>{r.type}</span></td><td className="p-3 text-slate-600 text-xs">{r.reason}</td><td className="p-3 font-bold">{r.vehicleReg}</td><td className="p-3">{formatPosition(r.positionId)}</td><td className="p-3"><span className={`px-2 py-1 rounded text-xs font-bold ${r.status==='Completed'?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}>{r.status}</span></td><td className="p-3">{r.completedDate ? new Date(r.completedDate).toLocaleString() : '-'}</td><td className="p-3 font-bold">{r.fitter}</td></tr>)}</tbody></table>
        )}
      </div>
    </div>
  );
}

function SettingsManager({ sizes, onAddSize, onRemoveSize, onSeed, users, onAddUser, onRemoveUser, onRequestNotifications, onWipe }) {
  const [newSize, setNewSize] = useState('');
  const [newUser, setNewUser] = useState({ initials: '', pin: '', role: 'Fitter' });
  const handleAddUser = (e) => { e.preventDefault(); if(newUser.initials && newUser.pin) { onAddUser({ ...newUser, initials: newUser.initials.toUpperCase() }); setNewUser({ initials: '', pin: '', role: 'Fitter' }); } };

  return (
    <div className="grid md:grid-cols-2 gap-8 animate-enter">
      <div className="space-y-8">
        <div className="bg-white p-6 rounded shadow"><h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Settings className="w-5 h-5"/> Tyre Configuration</h3><div className="mb-6"><h4 className="font-bold text-sm mb-2">Tyre Sizes</h4><div className="flex flex-wrap gap-2 mb-4">{sizes.map(s => <span key={s.id} className="bg-slate-100 px-3 py-1 rounded-full text-sm flex gap-2 items-center">{s.name}<button onClick={()=>onRemoveSize(s.id)} className="text-red-400 hover:text-red-600"><X className="w-3 h-3"/></button></span>)}</div><div className="flex gap-2"><input className="border p-2 rounded flex-1" placeholder="New Size" value={newSize} onChange={e=>setNewSize(e.target.value)} /><button onClick={()=>{onAddSize(newSize); setNewSize('');}} className="bg-blue-600 text-white px-4 py-2 rounded">Add</button></div></div><div className="border-t pt-6"><h4 className="font-bold text-sm mb-2">Notifications</h4><p className="text-xs text-slate-500 mb-3">Enable browser alerts for upcoming retorques.</p><button onClick={onRequestNotifications} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded text-sm font-medium transition"><Bell className="w-4 h-4" /> Enable Notifications</button></div></div>
        <div className="bg-white p-6 rounded shadow"><h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Database className="w-5 h-5"/> System Actions</h3><p className="text-xs text-red-600 font-bold mb-4">If you are not Dale - DO NOT press this button</p><div className="flex flex-col gap-3"><button onClick={onSeed} className="flex items-center justify-center gap-2 bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-900 w-full"><Database className="w-4 h-4"/> Initialize Database</button><button onClick={onWipe} className="flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded hover:bg-red-100 w-full font-bold"><AlertOctagon className="w-4 h-4" /> Wipe Operational Data</button></div></div>
      </div>
      <div className="bg-white p-6 rounded shadow h-fit"><h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Users className="w-5 h-5"/> User Management</h3><form onSubmit={handleAddUser} className="bg-slate-50 p-4 rounded mb-6 border"><h4 className="font-bold text-sm mb-3">Add New User</h4><div className="grid grid-cols-2 gap-2 mb-2"><input className="border p-2 rounded uppercase" placeholder="Initials" maxLength={3} value={newUser.initials} onChange={e=>setNewUser({...newUser, initials: e.target.value})} required /><input className="border p-2 rounded" placeholder="PIN" maxLength={4} type="password" value={newUser.pin} onChange={e=>setNewUser({...newUser, pin: e.target.value})} required /></div><select className="w-full border p-2 rounded mb-2" value={newUser.role} onChange={e=>setNewUser({...newUser, role: e.target.value})}><option value="Admin">Admin</option><option value="Manager">Manager</option><option value="Fitter">Fitter</option></select><button className="w-full bg-blue-600 text-white py-2 rounded font-bold">Create User</button></form><div className="space-y-2">{users.map(u => (<div key={u.id} className="flex justify-between items-center p-3 border rounded hover:bg-slate-50"><div><div className="font-bold">{u.initials}</div><div className="text-xs text-slate-500">{u.role}</div></div><button onClick={() => onRemoveUser(u.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button></div>))}</div></div>
    </div>
  );
}
