import React, { useState, useEffect } from 'react';
import { Check, Briefcase, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';

const TRADES = [
  // Construction - General
  "General Contractor",
  "Building Contractor",
  "Residential Builder",
  "Commercial Builder",
  "Remodeling Contractor",
  
  // Plumbing & Piping
  "Plumber",
  "Master Plumber",
  "Journeyman Plumber",
  "Pipefitter",
  "Steamfitter",
  "Sprinkler Fitter",
  "Medical Gas Installer",
  "Backflow Prevention Technician",
  
  // Electrical
  "Electrician",
  "Master Electrician",
  "Journeyman Electrician",
  "Residential Electrician",
  "Commercial Electrician",
  "Industrial Electrician",
  "Lineman",
  "Inside Wireman",
  "Low Voltage Technician",
  "Fire Alarm Technician",
  "Security Alarm Installer",
  "Telecommunications Installer",
  "Solar Photovoltaic Installer",
  "Wind Turbine Technician",
  
  // HVAC & Refrigeration
  "HVAC Technician",
  "HVAC Contractor",
  "Air Conditioning Contractor",
  "Heating Contractor",
  "Refrigeration Technician",
  "Commercial Refrigeration",
  "Boiler Operator",
  "Boiler Installer",
  "Mechanical Contractor",
  
  // Structural Trades
  "Carpenter",
  "Rough Carpenter",
  "Finish Carpenter",
  "Cabinet Maker",
  "Millwork Installer",
  "Framer",
  "Concrete Contractor",
  "Concrete Finisher",
  "Mason",
  "Bricklayer",
  "Block Mason",
  "Stone Mason",
  "Tile Setter",
  "Marble Setter",
  "Terrazzo Worker",
  "Plasterer",
  "Stucco Contractor",
  "Drywall Installer",
  "Drywall Finisher",
  "Lather",
  
  // Exterior & Roofing
  "Roofer",
  "Roofing Contractor",
  "Sheet Metal Worker",
  "Siding Installer",
  "Gutter Installer",
  "Waterproofing Contractor",
  "Caulking Contractor",
  "Glazier",
  "Window Installer",
  "Door Installer",
  
  // Finishing Trades
  "Painter",
  "Painting Contractor",
  "Wallpaper Hanger",
  "Decorator",
  "Flooring Installer",
  "Hardwood Floor Installer",
  "Carpet Installer",
  "Vinyl Floor Installer",
  "Epoxy Floor Installer",
  
  // Insulation & Weatherization
  "Insulation Contractor",
  "Spray Foam Insulator",
  "Weatherization Specialist",
  "Energy Auditor",
  
  // Welding & Metal
  "Welder",
  "Certified Welder",
  "Pipefitter-Welder",
  "Structural Welder",
  "Ironworker",
  "Reinforcing Ironworker",
  "Ornamental Ironworker",
  "Structural Steel Erector",
  "Metal Building Assembler",
  
  // Demolition & Excavation
  "Demolition Contractor",
  "Excavation Contractor",
  "Grading Contractor",
  "Trenching Contractor",
  "Site Work Contractor",
  "Earthmoving Contractor",
  
  // Heavy Equipment
  "Heavy Equipment Operator",
  "Crane Operator",
  "Tower Crane Operator",
  "Rigger",
  "Hoist Operator",
  "Forklift Operator",
  "Pile Driver Operator",
  
  // Specialty Construction
  "Elevator Mechanic",
  "Elevator Installer",
  "Escalator Mechanic",
  "Asbestos Abatement Contractor",
  "Lead Abatement Contractor",
  "Mold Remediation Contractor",
  "Fire Sprinkler Installer",
  "Fire Suppression Contractor",
  "Kitchen Hood System Installer",
  "Swimming Pool Contractor",
  "Spa & Hot Tub Installer",
  "Fence Contractor",
  "Dock Builder",
  "Marina Contractor",
  "Well Driller",
  "Well Pump Installer",
  "Irrigation Contractor",
  "Lawn Sprinkler Installer",
  
  // Septic & Wastewater
  "Septic System Installer",
  "Septic Tank Installer",
  "Septic System Designer",
  "Septic System Pumper",
  "Septic System Inspector",
  "Wastewater Treatment Operator",
  "Wastewater Facility Operator",
  "On-Site Wastewater Installer",
  
  // Landscaping & Outdoor
  "Landscape Contractor",
  "Landscape Architect",
  "Arborist",
  "Tree Trimmer",
  "Tree Service Operator",
  "Pesticide Applicator",
  "Lawn Care Operator",
  "Turf Management Specialist",
  
  // Professional Services
  "Architect",
  "Professional Engineer",
  "Structural Engineer",
  "Civil Engineer",
  "Mechanical Engineer",
  "Electrical Engineer",
  "Land Surveyor",
  "Professional Land Surveyor",
  "Geologist",
  "Soil Scientist",
  "Interior Designer",
  
  // Inspection & Testing
  "Home Inspector",
  "Building Inspector",
  "Code Enforcement Officer",
  "Plans Examiner",
  "Structural Inspector",
  "Roofing Inspector",
  "Electrical Inspector",
  "Plumbing Inspector",
  "Mechanical Inspector",
  "Fire Inspector",
  "Elevator Inspector",
  "Environmental Inspector",
  "Asbestos Inspector",
  "Lead Inspector",
  "Mold Inspector",
  "Radon Measurement Technician",
  "Non-Destructive Testing Technician",
  
  // Real Estate Related
  "Real Estate Agent",
  "Real Estate Broker",
  "Real Estate Appraiser",
  "Property Manager",
  "Community Association Manager",
  "Mortgage Broker",
  "Mortgage Loan Originator",
  "Title Examiner",
  "Escrow Agent",
  
  // Automotive & Transportation
  "Auto Mechanic",
  "Automotive Technician",
  "Diesel Mechanic",
  "Heavy Truck Mechanic",
  "Auto Body Repair",
  "Collision Repair Technician",
  "Paint & Body Specialist",
  "Transmission Specialist",
  "Brake Specialist",
  "Emissions Inspector",
  "Vehicle Safety Inspector",
  "Smog Technician",
  "Tire Technician",
  "Auto Glass Technician",
  "Locksmith",
  "Automotive Locksmith",
  "Towing Operator",
  "Vehicle Towing Service",
  "Driving Instructor",
  "CDL Instructor",
  "Motorcycle Mechanic",
  "Marine Mechanic",
  "Small Engine Mechanic",
  "Aircraft Mechanic",
  "Aviation Maintenance Technician",
  
  // Appliance & Equipment
  "Appliance Repair Technician",
  "Refrigerator Technician",
  "Washer/Dryer Technician",
  "HVAC Equipment Installer",
  "Commercial Kitchen Equipment Installer",
  "Medical Equipment Installer",
  "Fire Extinguisher Service",
  
  // Pest Control & Environmental
  "Pest Control Operator",
  "Fumigator",
  "Termite Control Operator",
  "Wildlife Control Operator",
  "Vector Control Specialist",
  "Mosquito Control Operator",
  
  // Health & Beauty
  "Cosmetologist",
  "Hair Stylist",
  "Barber",
  "Nail Technician",
  "Esthetician",
  "Massage Therapist",
  "Tattoo Artist",
  "Body Piercer",
  "Permanent Makeup Artist",
  "Electrologist",
  
  // Food Service
  "Food Service Manager",
  "Food Handler",
  "Food Safety Manager",
  "Certified Food Manager",
  "Mobile Food Vendor",
  "Catering Operator",
  "Alcohol Server",
  "Bartender",
  
  // Specialty Animal Care
  "Farrier",
  "Veterinary Technician",
  "Animal Control Officer",
  "Dog Groomer",
  "Pet Trainer",
  "Kennel Operator",
  
  // Water & Marine
  "Water Treatment Operator",
  "Water Distribution Operator",
  "Swimming Pool Operator",
  "Lifeguard",
  "Boat Captain",
  "Charter Boat Captain",
  "Commercial Fisherman",
  "Diver (Commercial)",
  "Underwater Welder",
  
  // Security & Safety
  "Security Guard",
  "Private Investigator",
  "Private Security Contractor",
  "Locksmith",
  "Alarm System Installer",
  "CCTV Installer",
  "Fire Alarm Installer",
  "Fire Sprinkler Designer",
  "Firearm Dealer",
  "Ammunition Dealer",
  
  // Funeral & Death Care
  "Funeral Director",
  "Embalmer",
  "Crematory Operator",
  "Cemetery Operator",
  
  // Other Licensed Trades
  "Auctioneer",
  "Pawnbroker",
  "Precious Metals Dealer",
  "Scrap Metal Dealer",
  "Debt Collector",
  "Bail Bondsman",
  "Process Server",
  "Court Reporter",
  "Notary Public",
  "Immigration Consultant",
  "Tax Preparer",
  "Accountant",
  "CPA (Certified Public Accountant)",
  "Enrolled Agent",
  "Insurance Agent",
  "Insurance Broker",
  "Public Adjuster",
  "Pharmacy Technician",
  "Optician",
  "Hearing Aid Dealer",
  "Medical Equipment Supplier",
  "Home Health Aide",
  "Nursing Home Administrator",
  "Childcare Provider",
  "Day Care Operator",
  "Foster Care Provider"
];

export default function TradeSelector({ selectedTrades, onSelectionChange, jurisdiction }) {
  const [open, setOpen] = useState(false);
  const [regulatedTrades, setRegulatedTrades] = useState(new Set());
  const [checkingRegulation, setCheckingRegulation] = useState(false);
  const [regulationChecked, setRegulationChecked] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (jurisdiction && jurisdiction !== 'Federal') {
      checkTradeRegulations();
    } else {
      setRegulatedTrades(new Set(TRADES)); // Federal = all trades available
      setRegulationChecked(true);
    }
  }, [jurisdiction]);

  const checkTradeRegulations = async () => {
    if (!jurisdiction) return;
    
    setCheckingRegulation(true);
    setRegulationChecked(false);
    
    try {
      const prompt = `For ${jurisdiction}, which of these trades/professions require licensing, certification, or registration?

Return a JSON object with a "regulated_trades" array containing ONLY the exact trade names (from the list below) that require some form of licensing, certification, registration, or permit in ${jurisdiction}.

Trades list:
${TRADES.join(', ')}

Be thorough - include trades that require:
- State license
- State certification
- State registration  
- Contractor license
- Professional license
- Any form of permit or credential

Return ONLY trades that are actually regulated in ${jurisdiction}. Do not include trades with no state requirements.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            regulated_trades: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setRegulatedTrades(new Set(response.regulated_trades || []));
      setRegulationChecked(true);
    } catch (error) {
      console.error('Error checking regulations:', error);
      // On error, assume all trades are available
      setRegulatedTrades(new Set(TRADES));
      setRegulationChecked(true);
    } finally {
      setCheckingRegulation(false);
    }
  };

  const toggleTrade = (trade) => {
    const updated = selectedTrades.includes(trade)
      ? selectedTrades.filter(t => t !== trade)
      : [...selectedTrades, trade];
    onSelectionChange(updated);
  };

  const isRegulated = (trade) => regulatedTrades.has(trade);

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-700">Select Your Trades</label>
      
      {jurisdiction && checkingRegulation && (
        <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Checking which trades are regulated in {jurisdiction}...</span>
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-[44px] text-left"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <Briefcase className="h-4 w-4 shrink-0 opacity-50" />
              {selectedTrades.length === 0 ? (
                <span className="text-gray-500">Select trades...</span>
              ) : (
                <span className="text-gray-700">{selectedTrades.length} selected</span>
              )}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-4 max-h-96 overflow-y-auto" align="start">
          <input
            type="text"
            placeholder="Search trades..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border rounded-md mb-3 focus:outline-none focus:ring-2 focus:ring-navy-600"
          />
          <div className="space-y-1">
            {TRADES.filter(trade => trade.toLowerCase().includes(searchQuery.toLowerCase())).map((trade) => {
              const regulated = isRegulated(trade);
              const showWarning = jurisdiction && regulationChecked && !regulated;
              
              return (
                <div
                  key={trade}
                  onClick={() => toggleTrade(trade)}
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-100 ${!regulated && jurisdiction && regulationChecked ? 'opacity-50' : ''}`}
                >
                  <Check
                    className={`h-4 w-4 shrink-0 ${
                      selectedTrades.includes(trade) ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  <span className={`text-sm ${!regulated && jurisdiction && regulationChecked ? 'text-gray-500' : ''}`}>
                    {trade}
                  </span>
                  {showWarning && (
                    <AlertCircle className="ml-auto h-4 w-4 shrink-0 text-amber-500" />
                  )}
                </div>
              );
            })}
            {TRADES.filter(trade => trade.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No trade found.</p>
            )}
          </div>
        </PopoverContent>
      </Popover>
      
      {jurisdiction && regulationChecked && (
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-200">
          <AlertCircle className="h-3 w-3 inline mr-1 text-amber-500" />
          Grayed trades may not be regulated in {jurisdiction}
        </div>
      )}

      {selectedTrades.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {selectedTrades.map(trade => {
            const regulated = isRegulated(trade);
            const showWarning = jurisdiction && regulationChecked && !regulated;
            
            return (
              <Badge
                key={trade}
                variant="secondary"
                className={`cursor-pointer ${
                  showWarning 
                    ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100' 
                    : 'bg-navy-100 text-navy-800 hover:bg-navy-200'
                }`}
                onClick={() => toggleTrade(trade)}
              >
                {showWarning && <AlertCircle className="h-3 w-3 mr-1" />}
                {trade}
                <span className="ml-1 text-xs">×</span>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}