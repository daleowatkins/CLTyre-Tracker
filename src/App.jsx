import React, { useState } from 'react';
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
  Clock
} from 'lucide-react';

// --- Utils & Helpers ---
const generateId = () => Math.random().toString(36).substr(2, 9);
const generateBarcode = () => '8' + Math.floor(10000000 + Math.random() * 90000000).toString();

// Calculate Tyre Age from DOT (WWYY)
const calculateAge = (dot) => {
  if (!dot || dot.length !== 4) return 'Unknown Age';
  const week = parseInt(dot.substring(0, 2));
  const year = parseInt("20" + dot.substring(2, 4)); // Assuming 2000s
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentWeek = Math.floor((now - new Date(currentYear, 0, 1)) / (7 * 24 * 60 * 60 * 1000));
  
  let ageInWeeks = ((currentYear - year) * 52) + (currentWeek - week);
  if (ageInWeeks < 0) ageInWeeks = 0;
  
  if (ageInWeeks < 52) return `${ageInWeeks} weeks old`;
  const ageInYears = (ageInWeeks / 52).toFixed(1);
  return `${ageInYears} years old`;
};

// Helper to determine axle group from position ID
const getAxleGroup = (pos) => {
  if (pos.startsWith('F')) return 'front'; // Front Steer
  if (pos.startsWith('D')) return 'drive'; // Drive Axle
  if (pos.startsWith('T')) return 'tag';   // Tag Axle
  if (pos.startsWith('R') && (pos.includes('S') || pos === 'RL' || pos === 'RR')) return 'rear_steer'; // Rear Steer (Specific to tri-coach)
  if (pos.startsWith('R')) return 'rear';  // Generic Rear / Drive
  return 'front';
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

// --- Initial Data ---

const initialInventory = [
  // Coach Tyres
  { id: 't1', brand: 'Michelin', model: 'X Multi Z', size: '295/80R22.5', barcode: '88239101', status: 'In Stock', dot: '1023' },
  { id: 't2', brand: 'Bridgestone', model: 'R-Steer', size: '295/80R22.5', barcode: '88239103', status: 'In Stock', dot: '4522' },
  { id: 't3', brand: 'Michelin', model: 'X Coach', size: '295/80R22.5', barcode: '88239105', status: 'In Stock', dot: '0224' },
  // Van Tyres
  { id: 't4', brand: 'Continental', model: 'VanContact', size: '235/65R16', barcode: '88239106', status: 'In Stock', dot: '2023' },
  { id: 't5', brand: 'Goodyear', model: 'Cargo Vector', size: '235/65R16', barcode: '88239107', status: 'In Stock', dot: '1523' },
];

const initialVehicles = [
  { 
    id: 'v1', 
    reg: 'K26 CLN', 
    type: 'Luton Box Van', 
    layout: '2-axle-dual', // Van with dual rear wheels
    specs: {
      front: { torque: 180, pressure: 55 },
      rear: { torque: 180, pressure: 60 } 
    },
    wheels: {} 
  },
  { 
    id: 'v2', 
    reg: 'L10 NC', 
    type: '2-Axle Coach', 
    layout: '2-axle-dual', // Coach: Steer + Drive Duals
    specs: {
      front: { torque: 600, pressure: 120 },
      rear: { torque: 600, pressure: 115 }
    },
    wheels: {}
  },
  { 
    id: 'v3', 
    reg: 'L1 CLN', 
    type: 'Tri-Axle Coach', 
    layout: '3-axle-rear-steer', // Steer + Drive (Dual) + Rear Steer (Single)
    specs: {
      front: { torque: 650, pressure: 125 },
      drive: { torque: 600, pressure: 115 }, // The duals
      rear_steer: { torque: 650, pressure: 125 } // The rear steer
    },
    wheels: {}
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('fit');
  const [inventory, setInventory] = useState(initialInventory);
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [retorqueRegister, setRetorqueRegister] = useState([]);
  
  // -- Actions --

  const addBatchStock = (data, quantity) => {
    const newTyres = Array.from({ length: quantity }).map(() => ({
      id: generateId(),
      ...data,
      barcode: generateBarcode(),
      status: 'In Stock'
    }));
    setInventory([...inventory, ...newTyres]);
  };

  const deleteTyre = (id) => {
    const confirm = window.prompt("Type 'DELETE' to confirm removing this tyre from stock permanently.");
    if (confirm === 'DELETE') {
      setInventory(inventory.filter(t => t.id !== id));
    } else if (confirm !== null) {
      alert("Delete cancelled. You must type DELETE exactly.");
    }
  };

  const fitTyre = (vehicleId, positionId, tyreBarcode, fitDate) => {
    const tyre = inventory.find(t => t.barcode === tyreBarcode && t.status === 'In Stock');
    if (!tyre) {
      alert("Tyre not found or not in stock!");
      return;
    }

    // Determine specs for this wheel position
    const vehicle = vehicles.find(v => v.id === vehicleId);
    const axleGroup = getAxleGroup(positionId);
    const spec = vehicle.specs[axleGroup] || { torque: 0, pressure: 0 };

    // Update Vehicle Wheel Map
    const updatedVehicles = vehicles.map(v => {
      if (v.id === vehicleId) {
        return { 
          ...v, 
          wheels: { 
            ...v.wheels, 
            [positionId]: { ...tyre, dateFitted: fitDate } 
          } 
        };
      }
      return v;
    });
    setVehicles(updatedVehicles);

    // Update Tyre Status
    const updatedInventory = inventory.map(t => 
      t.id === tyre.id ? { ...t, status: 'Fitted', vehicleId, positionId } : t
    );
    setInventory(updatedInventory);

    // Create Retorque Task
    const newTask = {
      id: generateId(),
      vehicleReg: vehicle.reg,
      positionId,
      fitmentDate: fitDate,
      dueDate: new Date(new Date(fitDate).getTime() + 24 * 60 * 60 * 1000).toISOString(),
      status: 'Pending',
      torqueSpec: spec.torque
    };
    setRetorqueRegister([newTask, ...retorqueRegister]);

    alert(`Tyre fitted! Retorque set for ${spec.torque}Nm.`);
    setActiveTab('retorque');
  };

  const pendingRetorques = retorqueRegister.filter(r => r.status === 'Pending').length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <div className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-xl font-bold flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Truck className="w-6 h-6 text-white" />
            </div>
            CLion Workshop <span className="text-blue-400 font-light">Tyre Tracker</span>
          </h1>
          
          <nav className="flex bg-slate-800 p-1 rounded-lg">
            <NavBtn label="Vehicles" icon={Truck} active={activeTab === 'vehicles'} onClick={() => setActiveTab('vehicles')} />
            <NavBtn label="Fit Tyre" icon={Wrench} active={activeTab === 'fit'} onClick={() => setActiveTab('fit')} />
            <NavBtn label="Inventory" icon={ClipboardList} active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
            <NavBtn 
              label="Retorques" 
              icon={AlertTriangle} 
              active={activeTab === 'retorque'} 
              onClick={() => setActiveTab('retorque')} 
              badge={pendingRetorques}
            />
          </nav>
        </div>
      </div>

      <main className="max-w-6xl mx-auto p-4 md:p-6">
        {activeTab === 'vehicles' && <VehicleManager vehicles={vehicles} setVehicles={setVehicles} retorqueRegister={retorqueRegister} />}
        {activeTab === 'fit' && <FitmentWorkflow vehicles={vehicles} inventory={inventory} onFit={fitTyre} />}
        {activeTab === 'inventory' && <InventoryManager inventory={inventory} onAddBatch={addBatchStock} onDelete={deleteTyre} />}
        {activeTab === 'retorque' && <RetorqueManager tasks={retorqueRegister} setTasks={setRetorqueRegister} />}
      </main>
    </div>
  );
}

// --- 1. Vehicle Manager & Frog Layout ---

function VehicleManager({ vehicles, setVehicles, retorqueRegister }) {
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedWheelId, setSelectedWheelId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ reg: '', type: 'Van', layout: '2-axle-dual' });

  const handleAdd = (e) => {
    e.preventDefault();
    const defaultSpecs = { front: { torque: 600, pressure: 120 }, rear: { torque: 600, pressure: 120 }, drive: { torque: 600, pressure: 120 }, rear_steer: { torque: 600, pressure: 120 } };
    setVehicles([...vehicles, { ...newVehicle, id: generateId(), specs: defaultSpecs, wheels: {} }]);
    setIsAdding(false);
    setNewVehicle({ reg: '', type: 'Van', layout: '2-axle-dual' });
  };

  const selectVehicle = (v) => {
    setSelectedVehicle(v);
    setSelectedWheelId(null);
  };

  const getSelectedWheelData = () => {
    if (!selectedVehicle || !selectedWheelId) return null;
    const axleGroup = getAxleGroup(selectedWheelId);
    const spec = selectedVehicle.specs[axleGroup] || { torque: '-', pressure: '-' };
    const tyre = selectedVehicle.wheels[selectedWheelId];
    return { id: selectedWheelId, axleGroup, spec, tyre };
  };

  const wheelData = getSelectedWheelData();

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {/* List Column */}
      <div className="md:col-span-1 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">Fleet List</h2>
          <button onClick={() => setIsAdding(!isAdding)} className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {isAdding && (
          <form onSubmit={handleAdd} className="bg-white p-4 rounded-xl shadow border border-blue-100 space-y-3 animate-fade-in">
            <input required placeholder="Registration" className="w-full p-2 border rounded" value={newVehicle.reg} onChange={e => setNewVehicle({...newVehicle, reg: e.target.value})} />
            <select className="w-full p-2 border rounded" value={newVehicle.layout} onChange={e => setNewVehicle({...newVehicle, layout: e.target.value})}>
              <option value="2-axle-dual">2 Axle (Dual Rear)</option>
              <option value="3-axle-rear-steer">3 Axle (Rear Steer)</option>
            </select>
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Save Vehicle</button>
          </form>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
          {vehicles.map(v => (
            <div 
              key={v.id} 
              onClick={() => selectVehicle(v)}
              className={`p-4 cursor-pointer transition hover:bg-slate-50 ${selectedVehicle?.id === v.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
            >
              <div className="font-bold text-lg">{v.reg}</div>
              <div className="text-xs text-slate-500 flex gap-2">
                <span>{v.type}</span> • <span className="text-slate-400">{v.layout}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Frog Column */}
      <div className="md:col-span-2 relative">
        {selectedVehicle ? (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
            <div className="flex justify-between items-start mb-6 border-b pb-4">
              <div>
                <h2 className="text-2xl font-black text-slate-800">{selectedVehicle.reg}</h2>
                <p className="text-slate-500">{selectedVehicle.type}</p>
                <p className="text-xs text-slate-400 mt-1">Click a wheel to view torque & pressure settings.</p>
              </div>
            </div>

            <div className="flex-1 relative min-h-[400px]">
              <VehicleFrog 
                vehicle={selectedVehicle} 
                retorques={retorqueRegister}
                mode="view" 
                onSelect={setSelectedWheelId} 
              />

              {/* WHEEL DETAILS CARD */}
              {wheelData && (
                <div className="absolute top-10 right-0 md:right-10 w-72 bg-slate-800 text-white p-5 rounded-xl shadow-2xl border border-slate-700 animate-fade-in z-20">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-blue-400">{formatPosition(wheelData.id)}</h3>
                      <p className="text-xs text-slate-400 uppercase tracking-wider">{formatAxleName(wheelData.axleGroup)}</p>
                    </div>
                    <button onClick={() => setSelectedWheelId(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Settings Section */}
                    <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600">
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <div className="text-slate-400 text-xs flex items-center justify-center gap-1 mb-1"><Wrench className="w-3 h-3"/> Torque</div>
                          <div className="font-mono text-xl font-bold">{wheelData.spec.torque} <span className="text-xs text-slate-500">Nm</span></div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-xs flex items-center justify-center gap-1 mb-1"><Gauge className="w-3 h-3"/> Pressure</div>
                          <div className="font-mono text-xl font-bold">{wheelData.spec.pressure} <span className="text-xs text-slate-500">PSI</span></div>
                        </div>
                      </div>
                    </div>

                    {/* Tyre Data Section */}
                    {wheelData.tyre ? (
                      <div className="space-y-2">
                         <div className="text-xs text-slate-400 font-bold uppercase border-b border-slate-700 pb-1">Fitted Tyre</div>
                         <div className="font-medium">{wheelData.tyre.brand} {wheelData.tyre.model}</div>
                         <div className="text-sm text-slate-400">{wheelData.tyre.size}</div>
                         <div className="text-xs font-mono bg-slate-900 p-2 rounded text-center text-slate-300">
                           S/N: {wheelData.tyre.barcode}
                         </div>
                         <div className="flex justify-between items-center text-xs mt-2">
                            <span className="text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {new Date(wheelData.tyre.dateFitted).toLocaleDateString()}</span>
                            <span className="text-blue-300 flex items-center gap-1"><Clock className="w-3 h-3" /> DOT: {wheelData.tyre.dot} ({calculateAge(wheelData.tyre.dot)})</span>
                         </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-slate-500 border-2 border-dashed border-slate-700 rounded-lg">
                        No tyre fitted
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100 rounded-xl border-2 border-dashed border-slate-200 p-10">
            <Truck className="w-16 h-16 mb-4 opacity-50" />
            <p>Select a vehicle to view wheel configuration.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- 2. Fitment Workflow ---

function FitmentWorkflow({ vehicles, inventory, onFit }) {
  const [step, setStep] = useState(1);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [fitDate, setFitDate] = useState(new Date().toISOString().split('T')[0]);

  const selectVehicle = (v) => { setSelectedVehicle(v); setStep(2); };
  const selectPosition = (posId) => { setSelectedPosition(posId); setStep(3); };

  // Get specs for selected position to show fitter
  const getFitterSpecs = () => {
    if (!selectedVehicle || !selectedPosition) return null;
    const axleGroup = getAxleGroup(selectedPosition);
    return selectedVehicle.specs[axleGroup];
  };
  const fitSpecs = getFitterSpecs();

  const handleScan = () => {
    const available = inventory.find(t => t.status === 'In Stock');
    if (available) setScannedBarcode(available.barcode);
    else alert("No stock available to scan");
  };

  const confirmFitment = () => {
    if(!scannedBarcode || !fitDate) return;
    onFit(selectedVehicle.id, selectedPosition, scannedBarcode, fitDate);
    setStep(1); setSelectedVehicle(null); setSelectedPosition(null); setScannedBarcode('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <StepIndicator num={1} label="Select Vehicle" active={step >= 1} />
        <div className="h-1 flex-1 bg-slate-100 mx-4"><div className={`h-full bg-blue-600 transition-all ${step >= 2 ? 'w-full' : 'w-0'}`} /></div>
        <StepIndicator num={2} label="Select Wheel" active={step >= 2} />
        <div className="h-1 flex-1 bg-slate-100 mx-4"><div className={`h-full bg-blue-600 transition-all ${step >= 3 ? 'w-full' : 'w-0'}`} /></div>
        <StepIndicator num={3} label="Scan Tyre" active={step >= 3} />
      </div>

      <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 min-h-[400px]">
        {step === 1 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {vehicles.map(v => (
              <button key={v.id} onClick={() => selectVehicle(v)} className="p-6 text-left border-2 border-slate-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition group">
                <div className="font-black text-xl text-slate-700 group-hover:text-blue-700">{v.reg}</div>
                <div className="text-sm text-slate-400">{v.type}</div>
              </button>
            ))}
          </div>
        )}
        {step === 2 && selectedVehicle && (
          <div className="text-center">
            <h3 className="text-lg font-bold mb-6">Click a wheel position to fit tyre</h3>
            <VehicleFrog vehicle={selectedVehicle} mode="select" onSelect={selectPosition} />
            <button onClick={() => setStep(1)} className="mt-8 text-slate-400 underline">Back to Vehicles</button>
          </div>
        )}
        {step === 3 && (
          <div className="max-w-md mx-auto space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold">Fitting to {selectedVehicle.reg}</h3>
              <div className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold mt-2">{formatPosition(selectedPosition)}</div>
            </div>

            {/* Fitter Guidance Card */}
            <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-xl text-center">
               <h4 className="text-amber-800 font-bold uppercase text-xs tracking-wider mb-2">Required Settings</h4>
               <div className="flex justify-center gap-8">
                  <div>
                    <div className="text-3xl font-black text-slate-900">{fitSpecs?.torque} <span className="text-sm text-slate-500 font-normal">Nm</span></div>
                    <div className="text-xs text-amber-700 font-bold">TORQUE</div>
                  </div>
                  <div>
                    <div className="text-3xl font-black text-slate-900">{fitSpecs?.pressure} <span className="text-sm text-slate-500 font-normal">PSI</span></div>
                    <div className="text-xs text-amber-700 font-bold">PRESSURE</div>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date Fitted</label>
                <input type="date" value={fitDate} onChange={e => setFitDate(e.target.value)} className="w-full p-3 border rounded-lg" />
              </div>
              <div>
                 <label className="block text-sm font-medium mb-1">Tyre Barcode</label>
                 <div className="flex gap-2">
                  <input value={scannedBarcode} onChange={e => setScannedBarcode(e.target.value)} className="flex-1 p-3 border rounded-lg font-mono text-lg" placeholder="Scan..." autoFocus />
                  <button onClick={handleScan} className="bg-slate-200 px-4 rounded-lg hover:bg-slate-300"><Barcode className="w-6 h-6 text-slate-700" /></button>
                </div>
              </div>
            </div>

            <button onClick={confirmFitment} disabled={!scannedBarcode} className="w-full bg-green-600 text-white p-4 rounded-xl font-bold text-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-200 flex justify-center items-center gap-2">
              <CheckCircle className="w-5 h-5" /> CONFIRM FITMENT
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- 3. Inventory Manager ---
function InventoryManager({ inventory, onAddBatch, onDelete }) {
  const [form, setForm] = useState({ brand: '', model: '', size: '', qty: 1, dot: '' });
  const [filter, setFilter] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    onAddBatch({ brand: form.brand, model: form.model, size: form.size, dot: form.dot }, parseInt(form.qty));
    setForm({ brand: '', model: '', size: '', qty: 1, dot: '' });
  };

  const filtered = inventory.filter(t => t.barcode.includes(filter) || t.brand.toLowerCase().includes(filter.toLowerCase()) || t.size.includes(filter));

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-700"><Plus className="w-5 h-5 text-green-600" /> Batch Add Stock</h3>
        <form onSubmit={handleAdd} className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <input required placeholder="Brand" className="p-2 border rounded" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} />
          <input required placeholder="Model" className="p-2 border rounded" value={form.model} onChange={e => setForm({...form, model: e.target.value})} />
          <input required placeholder="Size" className="p-2 border rounded" value={form.size} onChange={e => setForm({...form, size: e.target.value})} />
          <input required placeholder="DOT (e.g 1024)" maxLength="4" className="p-2 border rounded" value={form.dot} onChange={e => setForm({...form, dot: e.target.value})} />
          <input type="number" min="1" max="50" required placeholder="Qty" className="p-2 border rounded" value={form.qty} onChange={e => setForm({...form, qty: e.target.value})} />
          <button className="bg-slate-900 text-white rounded font-medium hover:bg-slate-800">Generate & Add</button>
        </form>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
          <h3 className="font-bold text-slate-700">Serialized Inventory</h3>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input placeholder="Search serial/brand..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8 p-1 border rounded text-sm w-64" />
          </div>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="p-3">Barcode (S/N)</th>
              <th className="p-3">Details</th>
              <th className="p-3">Age</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(t => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="p-3 font-mono font-bold text-slate-700">{t.barcode}</td>
                <td className="p-3"><div className="font-medium">{t.brand} {t.model}</div><div className="text-xs text-slate-500">{t.size}</div></td>
                <td className="p-3 text-slate-600"><div className="flex items-center gap-1"><Clock className="w-3 h-3 text-slate-400"/> {calculateAge(t.dot)}</div><div className="text-xs text-slate-400">DOT: {t.dot}</div></td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${t.status === 'In Stock' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{t.status}</span>
                  {t.status === 'Fitted' && <div className="text-xs mt-1">Vehicle: {t.vehicleReg || 'Unknown'}</div>}
                </td>
                <td className="p-3 text-right">
                  {t.status === 'In Stock' && (
                    <button onClick={() => onDelete(t.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded" title="Delete Stock">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- 4. Retorque Manager ---
function RetorqueManager({ tasks, setTasks }) {
  const completeTask = (id) => setTasks(tasks.map(t => t.id === id ? { ...t, status: 'Completed', completedDate: new Date().toISOString() } : t));
  const active = tasks.filter(t => t.status === 'Pending');
  const history = tasks.filter(t => t.status === 'Completed');

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500" /> Outstanding Retorques</h3>
        {active.length === 0 ? <div className="p-8 bg-green-50 border border-green-100 rounded-xl text-green-800 flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5" /> All compliant.</div> : (
          <div className="grid gap-4">
            {active.map(task => (
              <div key={task.id} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-amber-500 flex justify-between items-center">
                <div>
                  <div className="font-black text-lg">{task.vehicleReg}</div>
                  <div className="text-sm text-slate-600">Position: {formatPosition(task.positionId)}</div>
                  <div className="text-xs text-amber-600 font-bold mt-1">Due: {new Date(task.dueDate).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono text-slate-400 mb-2">Spec: {task.torqueSpec} Nm</div>
                  <button onClick={() => completeTask(task.id)} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-800">Confirm Retorque</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><History className="w-5 h-5 text-slate-400" /> Retorque History</h3>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">Date Completed</th><th className="p-3">Vehicle</th><th className="p-3">Position</th><th className="p-3 text-right">Status</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {history.map(h => (
                <tr key={h.id}>
                  <td className="p-3 font-medium">{new Date(h.completedDate).toLocaleDateString()}</td>
                  <td className="p-3 font-bold">{h.vehicleReg}</td>
                  <td className="p-3">{formatPosition(h.positionId)}</td>
                  <td className="p-3 text-right text-green-600 font-bold text-xs">VERIFIED</td>
                </tr>
              ))}
              {history.length === 0 && <tr><td colSpan="4" className="p-6 text-center text-slate-400">No history yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- 5. Vehicle Frog ---
function VehicleFrog({ vehicle, retorques = [], mode = 'view', onSelect }) {
  const { layout, wheels } = vehicle;
  
  const renderWheel = (posId, label) => {
    const wheelData = wheels[posId];
    const pendingRetorque = retorques.find(r => r.vehicleReg === vehicle.reg && r.positionId === posId && r.status === 'Pending');
    const Wrapper = (mode === 'select' || mode === 'view') ? 'button' : 'div';
    const clickHandler = onSelect ? () => onSelect(posId) : undefined;

    return (
      <Wrapper 
        key={posId}
        onClick={clickHandler}
        className={`
          relative flex flex-col items-center p-2 rounded-lg border-2 transition-all w-24
          hover:scale-105 cursor-pointer hover:border-blue-500 hover:bg-blue-50
          ${wheelData ? 'bg-slate-50 border-slate-300' : 'bg-slate-100 border-dashed border-slate-300'}
          ${pendingRetorque ? 'ring-2 ring-amber-500 ring-offset-2' : ''}
        `}
      >
        <div className={`w-8 h-12 rounded bg-gradient-to-r from-slate-700 to-slate-900 mb-2 border-l-2 border-r-2 border-slate-600 ${!wheelData && 'opacity-20'}`}></div>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        {mode === 'view' && pendingRetorque && <div className="absolute -top-2 -right-2 bg-amber-500 text-white rounded-full p-1 animate-pulse"><Wrench className="w-3 h-3" /></div>}
      </Wrapper>
    );
  };

  const renderAxle = (wheelsInAxle) => (
    // Increased max-w-lg (from max-w-xs) to allow 4 wheels to sit comfortably side-by-side without wrapping
    <div className="flex justify-between items-center w-full max-w-lg mx-auto my-4 relative px-4">
      <div className="h-2 bg-slate-300 absolute w-full top-1/2 -translate-y-1/2 -z-10 rounded left-0"></div>
      {wheelsInAxle}
    </div>
  );

  return (
    <div className="flex flex-col items-center py-8">
      <div className="mb-4 text-slate-300 flex flex-col items-center">
        <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[30px] border-b-slate-200"></div>
        <span className="text-xs font-bold mt-1">FRONT</span>
      </div>

      {renderAxle([renderWheel('FL', 'Front L'), renderWheel('FR', 'Front R')])}
      <div className="h-16 border-l-4 border-slate-200 border-dashed my-2"></div>

      {/* 2-Axle Layouts */}
      {layout === '2-axle-dual' && renderAxle([
        <div key="ral" className="flex gap-1">{renderWheel('RLO', 'Outer')}{renderWheel('RLI', 'Inner')}</div>,
        <div key="rar" className="flex gap-1">{renderWheel('RRI', 'Inner')}{renderWheel('RRO', 'Outer')}</div>
      ])}

      {/* 3-Axle Rear Steer Layout (Coach) */}
      {layout === '3-axle-rear-steer' && (
        <>
           {/* Drive Axle (Duals) */}
           {renderAxle([
            <div key="dal" className="flex gap-1">{renderWheel('DLO', 'Dr L-Out')}{renderWheel('DLI', 'Dr L-In')}</div>,
            <div key="dar" className="flex gap-1">{renderWheel('DRI', 'Dr R-In')}{renderWheel('DRO', 'Dr R-Out')}</div>
          ])}
          
           {/* Rear Steer (Singles) */}
           {renderAxle([renderWheel('RSL', 'R-Steer L'), renderWheel('RSR', 'R-Steer R')])}
        </>
      )}
    </div>
  );
}

// --- Helpers ---
const NavBtn = ({ label, icon: Icon, active, onClick, badge }) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-md transition text-sm font-medium ${active ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
    <div className="relative"><Icon className="w-4 h-4" />{badge > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">{badge}</span>}</div><span className="hidden md:inline">{label}</span>
  </button>
);
const StepIndicator = ({ num, label, active }) => (
  <div className={`flex items-center gap-2 ${active ? 'text-blue-600' : 'text-slate-300'}`}>
    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 ${active ? 'border-blue-600 bg-blue-50' : 'border-slate-200'}`}>{num}</div><span className="hidden md:inline font-medium text-sm">{label}</span>
  </div>
);