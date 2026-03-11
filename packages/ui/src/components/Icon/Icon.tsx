import React from 'react';
export const Icon: React.FC<{name: string}> = ({name}) => {
  return React.createElement('span', { className: 'inc-icon' }, name);
};
