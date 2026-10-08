import React from 'react';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ErrorPage from './ErrorPage';
import { ROUTES } from '../constants/routes';

function NotFound() {
    return (
        <ErrorPage
            code="404"
            title="Page Not Found"
            message="The maintenance screen or equipment record you are looking for might have been moved, deleted, or does not exist."
            actions={[{ label: 'Back to Dashboard', to: ROUTES.DASHBOARD, icon: <ArrowForwardIcon /> }]}
        />
    );
}

export default NotFound;
