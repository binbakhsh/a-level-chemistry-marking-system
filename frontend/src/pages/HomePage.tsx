import { Link } from 'react-router-dom';
import { BeakerIcon, CheckCircleIcon, ClockIcon, DocumentCheckIcon } from '@heroicons/react/24/outline';

export default function HomePage() {
  const features = [
    {
      icon: DocumentCheckIcon,
      title: 'Automated Marking',
      description: 'Upload your chemistry papers and get instant, accurate marking based on AQA markschemes.',
    },
    {
      icon: BeakerIcon,
      title: 'Chemistry-Specific',
      description: 'Specialized algorithms handle chemical equations, formulas, and scientific terminology.',
    },
    {
      icon: ClockIcon,
      title: 'Instant Feedback',
      description: 'Get detailed feedback and explanations within seconds of submission.',
    },
    {
      icon: CheckCircleIcon,
      title: 'High Accuracy',
      description: 'Advanced AI ensures 95%+ marking accuracy compared to human markers.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <BeakerIcon className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">
                AQA Chemistry Marking
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/login" className="text-gray-600 hover:text-gray-900">
                Login
              </Link>
              <Link to="/register" className="btn-primary">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Automated Marking for
            <span className="text-primary-600"> AQA Chemistry</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Upload your A-Level Chemistry papers and get instant, accurate marking with detailed feedback. 
            Built specifically for AQA Paper 7405/1 (Inorganic and Physical Chemistry).
          </p>
          <div className="flex justify-center space-x-4">
            <Link to="/register" className="btn-primary text-lg px-8 py-3">
              Start Marking Papers
            </Link>
            <Link to="/login" className="btn-secondary text-lg px-8 py-3">
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Why Choose Our Marking System?
          </h2>
          <p className="text-lg text-gray-600">
            Advanced AI technology designed specifically for chemistry education
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="card p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-lg mb-4">
                <feature.icon className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works Section */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600">
              Get your papers marked in three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 text-white rounded-full text-xl font-bold mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Upload Your Paper
              </h3>
              <p className="text-gray-600">
                Upload a PDF of your completed AQA Chemistry paper. Our system supports all question types.
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 text-white rounded-full text-xl font-bold mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                AI Processing
              </h3>
              <p className="text-gray-600">
                Our advanced AI reads your answers and marks them against the official AQA markscheme.
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 text-white rounded-full text-xl font-bold mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Get Results
              </h3>
              <p className="text-gray-600">
                Receive detailed feedback, your score, and suggestions for improvement within seconds.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary-600 py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Improve Your Chemistry Grades?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of students already using our automated marking system.
          </p>
          <Link to="/register" className="btn bg-white text-primary-600 hover:bg-gray-50 text-lg px-8 py-3">
            Get Started Free
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <BeakerIcon className="h-8 w-8 text-primary-400" />
              <span className="ml-2 text-xl font-semibold">
                AQA Chemistry Marking
              </span>
            </div>
            <p className="text-gray-400">
              © 2024 AQA Chemistry Marking System. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}