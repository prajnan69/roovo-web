import LegalPageLayout from './LegalPageLayout';

const ContactUs = () => {
    return (
        <LegalPageLayout title="Contact Us">
            <p className="lead text-slate-600 mb-8">
                We are here to help! If you have any questions, concerns, or feedback, please reach out to us using the details below.
            </p>

            <div className="space-y-8">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <h3 className="mt-0 text-indigo-600">Customer Support</h3>
                    <p className="mb-2">For help with bookings, payments, or account issues:</p>
                    <p className="font-semibold text-lg">
                        <a href="mailto:support@roovo.in" className="no-underline text-slate-900 hover:text-indigo-600">support@roovo.in</a>
                    </p>
                    <p className="text-sm text-slate-500 mt-2">Response time: Usually within 24 hours</p>
                </div>

                <div>
                    <h3>Registered Office</h3>
                    <address className="not-italic text-slate-600">
                        <strong>Roovo Hospitality Private Limited</strong><br />

                        India
                    </address>
                </div>

                <div>
                    <h3>Phone Support</h3>
                    <p>
                        <a href="tel:+917996090696" className="no-underline text-slate-900 font-semibold">+91 7996090696</a><br />
                    </p>
                </div>
            </div>
        </LegalPageLayout>
    );
};

export default ContactUs;
