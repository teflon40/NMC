import React from 'react';
import PracticalResultsTable from './downloads/PracticalResultsTable';
import CarePlanResultsTable from './downloads/CarePlanResultsTable';
import CareStudyResultsTable from './downloads/CareStudyResultsTable';
import ObstetricianResultsTable from './downloads/ObstetricianResultsTable';

interface DownloadsProps {
  title: string;
  type: 'practical' | 'care_study' | 'care_plan' | 'obstetrician';
}

const Downloads: React.FC<DownloadsProps> = ({ type }) => {
  switch (type) {
    case 'practical': return <PracticalResultsTable />;
    case 'care_plan': return <CarePlanResultsTable />;
    case 'care_study': return <CareStudyResultsTable />;
    case 'obstetrician': return <ObstetricianResultsTable />;
    default: return <div className="p-8 text-gray-400">Unknown download type.</div>;
  }
};

export default Downloads;