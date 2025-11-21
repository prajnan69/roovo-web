import React from 'react';

interface RouteProps {
  path: string;
  render: (props: any) => React.ReactElement;
  match?: any;
}

const Route: React.FC<RouteProps> = ({ render, match }) => {
  return render({ match });
};

export default Route;
