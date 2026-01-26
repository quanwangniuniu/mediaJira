import React from 'react';
import ProfilePageView from '../../components/jiraProfile/ProfilePageView';

// Helper function to generate dates relative to today
const formatDate = (daysAgo: number): string => {
  const today = new Date();
  const date = new Date(today);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
};

export default {
  title: 'Pages/Profile/ProfilePageView',
  component: ProfilePageView,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Profile page view component with editable fields and optional tabs for Dashboard, Organization, and Subscription management.',
      },
    },
  },
  tags: ['autodocs'],
};

export const Default = {
  name: 'Default Profile',
  render: () => (
    <div className="min-h-screen bg-gray-50">
      <ProfilePageView
        user={{
          name: 'John Doe',
          email: 'john.doe@example.com',
          role: 'User',
          avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=0D8ABC&color=fff',
        }}
        initialFields={{
          job: 'Software Engineer',
          department: 'Engineering',
          organization: 'Example Organization',
          location: 'San Francisco, CA',
        }}
        workedOnTasks={[
          {
            id: 1,
            name: 'Q4 Budget Request',
            type: 'task' as const,
            team: 'Finance Team',
            action: 'updated' as const,
            date: formatDate(1),
            icon: 'checkbox' as const,
          },
          {
            id: 2,
            name: 'Marketing Campaign Asset',
            type: 'task' as const,
            team: 'Marketing Team',
            action: 'created' as const,
            date: formatDate(2),
            icon: 'bookmark' as const,
          },
          {
            id: 3,
            name: 'Product Retrospective',
            type: 'task' as const,
            team: 'Product Team',
            action: 'updated' as const,
            date: formatDate(3),
            icon: 'document' as const,
          },
          {
            id: 4,
            name: 'System Scaling Plan',
            type: 'task' as const,
            team: 'Engineering',
            action: 'created' as const,
            date: formatDate(5),
            icon: 'checkbox' as const,
          },
          {
            id: 5,
            name: 'Performance Optimization',
            type: 'task' as const,
            team: 'Engineering',
            action: 'updated' as const,
            date: formatDate(6),
            icon: 'checkbox' as const,
          },
        ]}
        onViewAllTasks={() => {
          console.log('View all tasks clicked');
        }}
        onShowMore={() => {
          console.log('Show more clicked');
        }}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Default profile page view with user information, editable fields, and Worked on container showing recent tasks.',
      },
    },
  },
};


export const WithCustomBackground = {
  name: 'With Custom Background',
  render: () => (
    <div className="min-h-screen bg-gray-50">
      <ProfilePageView
        user={{
          name: 'Jane Doe',
          email: 'jane.doe@example.com',
          role: 'Designer',
          avatar: 'https://i.pravatar.cc/150?img=1',
        }}
        initialFields={{
          job: 'UI/UX Designer',
          department: 'Design',
          organization: 'Creative Agency',
          location: 'New York, NY',
        }}
        backgroundUrl="/bg-gradient.svg"
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Profile page view with custom background image.',
      },
    },
  },
};

export const WithEmptyFields = {
  name: 'With Empty Fields',
  render: () => (
    <div className="min-h-screen bg-gray-50">
      <ProfilePageView
        user={{
          name: 'New User',
          email: 'newuser@example.com',
        }}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Profile page view with empty fields showing default placeholders.',
      },
    },
  },
};

export const EditingMode = {
  name: 'Editing Mode',
  render: () => (
    <div className="min-h-screen bg-gray-50">
      <ProfilePageView
        user={{
          name: 'John Doe',
          email: 'john.doe@example.com',
          role: 'User',
          avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=0D8ABC&color=fff',
        }}
        initialFields={{
          job: 'Software Engineer',
          department: 'Engineering',
          organization: 'Example Organization',
          location: 'San Francisco, CA',
        }}
        initialEditing={true}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Profile page view in editing mode with job field active.',
      },
    },
  },
};

export const WithWorkedOn = {
  name: 'With Worked On',
  render: () => (
    <div className="min-h-screen bg-gray-50">
      <ProfilePageView
        user={{
          name: 'John Doe',
          email: 'john.doe@example.com',
          role: 'User',
          avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=0D8ABC&color=fff',
        }}
        initialFields={{
          job: 'Software Engineer',
          department: 'Engineering',
          organization: 'Example Organization',
          location: 'San Francisco, CA',
        }}
        workedOnTasks={[
          {
            id: 1,
            name: 'Task 2',
            type: 'task' as const,
            team: 'My Software Team',
            action: 'updated' as const,
            date: formatDate(3),
            icon: 'bookmark' as const,
          },
          {
            id: 2,
            name: 'front end design',
            type: 'task' as const,
            team: 'My Software Team',
            action: 'created' as const,
            date: formatDate(8),
            icon: 'checkbox' as const,
          },
          {
            id: 3,
            name: 'metadata system design',
            type: 'task' as const,
            team: 'My Software Team',
            action: 'updated' as const,
            date: formatDate(8),
            icon: 'checkbox' as const,
          },
          {
            id: 4,
            name: 'Template - Decision documentation',
            type: 'template' as const,
            team: 'Software Development',
            action: 'created' as const,
            date: formatDate(11),
            icon: 'document' as const,
          },
          {
            id: 5,
            name: 'Template - Meeting notes',
            type: 'template' as const,
            team: 'Software Development',
            action: 'created' as const,
            date: formatDate(11),
            icon: 'document' as const,
          },
        ]}
        onViewAllTasks={() => {
          console.log('View all tasks clicked');
        }}
        onShowMore={() => {
          console.log('Show more clicked');
        }}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Profile page view with Worked on container showing recent tasks on the right side. Tasks are displayed with icons, team names, and action dates.',
      },
    },
  },
};

export const WithWorkedOnManyTasks = {
  name: 'With Worked On - Many Tasks',
  render: () => {
    // Generate more tasks to show "Show more" functionality
    const manyTasks = [
      {
        id: 1,
        name: 'Q4 Budget Request',
        type: 'task' as const,
        team: 'Finance Team',
        action: 'updated' as const,
        date: formatDate(1),
        icon: 'checkbox' as const,
      },
      {
        id: 2,
        name: 'Marketing Campaign Asset',
        type: 'task' as const,
        team: 'Marketing Team',
        action: 'created' as const,
        date: formatDate(2),
        icon: 'bookmark' as const,
      },
      {
        id: 3,
        name: 'Product Retrospective',
        type: 'task' as const,
        team: 'Product Team',
        action: 'updated' as const,
        date: formatDate(3),
        icon: 'document' as const,
      },
      {
        id: 4,
        name: 'System Scaling Plan',
        type: 'task' as const,
        team: 'Engineering',
        action: 'created' as const,
        date: formatDate(5),
        icon: 'checkbox' as const,
      },
      {
        id: 5,
        name: 'Performance Optimization',
        type: 'task' as const,
        team: 'Engineering',
        action: 'updated' as const,
        date: formatDate(6),
        icon: 'checkbox' as const,
      },
      {
        id: 6,
        name: 'Experiment: A/B Testing',
        type: 'task' as const,
        team: 'Data Science',
        action: 'created' as const,
        date: formatDate(7),
        icon: 'bookmark' as const,
      },
      {
        id: 7,
        name: 'Alert: High Traffic',
        type: 'task' as const,
        team: 'DevOps',
        action: 'updated' as const,
        date: formatDate(9),
        icon: 'document' as const,
      },
    ];

    return (
      <div className="min-h-screen bg-gray-50">
        <ProfilePageView
          user={{
            name: 'Jane Smith',
            email: 'jane.smith@example.com',
            role: 'Product Manager',
            avatar: 'https://ui-avatars.com/api/?name=Jane+Smith&background=6366f1&color=fff',
          }}
          initialFields={{
            job: 'Product Manager',
            department: 'Product',
            organization: 'Tech Corp',
            location: 'Seattle, WA',
          }}
          workedOnTasks={manyTasks}
          onViewAllTasks={() => {
            console.log('View all tasks clicked');
          }}
          onShowMore={() => {
            console.log('Show more clicked');
          }}
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Profile page view with many tasks showing the "Show more" link when there are more than 5 tasks.',
      },
    },
  },
};

export const WithWorkedOnEmpty = {
  name: 'With Worked On - Empty',
  render: () => (
    <div className="min-h-screen bg-gray-50">
      <ProfilePageView
        user={{
          name: 'New User',
          email: 'newuser@example.com',
          role: 'User',
          avatar: 'https://ui-avatars.com/api/?name=New+User&background=94a3b8&color=fff',
        }}
        initialFields={{
          job: 'Junior Developer',
          department: 'Engineering',
          organization: 'Startup Inc',
          location: 'Remote',
        }}
        workedOnTasks={[]}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Profile page view with empty Worked on container (no tasks). The Worked on section will not be displayed when the tasks array is empty.',
      },
    },
  },
};

