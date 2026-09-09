"use client";

import * as React from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Modal,
  ModalTrigger,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@sih/ui";
import { Camera, MapPin, Radio, ShieldAlert } from "lucide-react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="font-display text-lg font-semibold text-text-primary border-b border-border-subtle pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className={`h-14 w-full rounded-md border border-border-subtle ${className}`} />
      <span className="font-mono text-xs text-text-muted">{name}</span>
    </div>
  );
}

export default function StyleGuidePage() {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="mx-auto max-w-5xl space-y-12 px-8 py-12">
        <header className="space-y-1">
          <p className="font-mono text-xs uppercase tracking-widest text-cyan-400">Trajectory Titans</p>
          <h1 className="font-display text-3xl font-semibold text-text-primary">Design System</h1>
          <p className="font-mono text-sm text-text-muted">
            Command-center primitives — SIH26127. Every component below is used verbatim on real screens.
          </p>
        </header>

        <Section title="Color — surfaces">
          <div className="grid grid-cols-5 gap-3">
            <Swatch name="bg-0" className="bg-bg-0" />
            <Swatch name="bg-1" className="bg-bg-1" />
            <Swatch name="bg-2" className="bg-bg-2" />
            <Swatch name="bg-3" className="bg-bg-3" />
            <Swatch name="bg-4" className="bg-bg-4" />
          </div>
        </Section>

        <Section title="Color — accent (state only)">
          <div className="grid grid-cols-4 gap-3">
            <Swatch name="cyan-500 (live)" className="bg-cyan-500" />
            <Swatch name="amber-500 (warning)" className="bg-amber-500" />
            <Swatch name="red-500 (critical)" className="bg-red-500" />
            <Swatch name="green-500 (healthy)" className="bg-green-500" />
          </div>
        </Section>

        <Section title="Typography">
          <div className="space-y-3">
            <p className="font-display text-3xl text-text-primary">Space Grotesk — Display / UI chrome</p>
            <p className="font-mono text-lg text-text-primary">JetBrains Mono — WB 20 AB 1234 · 14:32:07 · 22.5793, 88.4172</p>
            <p className="font-mono text-sm text-text-secondary">
              Plate numbers, timestamps, coordinates, and camera IDs are always set in monospace — it's what
              separates an ops tool from a CRUD app.
            </p>
          </div>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Track Vehicle</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Resolve Alert</Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
            <Button variant="secondary" size="icon">
              <Camera className="h-4 w-4" />
            </Button>
          </div>
        </Section>

        <Section title="Badges">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="cyan" dot>
              Live
            </Badge>
            <Badge tone="green" dot>
              Online
            </Badge>
            <Badge tone="amber" dot>
              Degraded
            </Badge>
            <Badge tone="red" dot>
              Critical
            </Badge>
            <Badge tone="neutral">Sector 5</Badge>
          </div>
        </Section>

        <Section title="Inputs & Select">
          <div className="grid max-w-md grid-cols-1 gap-3">
            <Input placeholder="WB 20 AB 1234" />
            <Select defaultValue="24h">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last 1 hour</SelectItem>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Section>

        <Section title="Tabs">
          <Tabs defaultValue="map" className="max-w-md">
            <TabsList>
              <TabsTrigger value="map">Map</TabsTrigger>
              <TabsTrigger value="table">Table</TabsTrigger>
              <TabsTrigger value="flow">Flow</TabsTrigger>
            </TabsList>
            <TabsContent value="map" className="pt-3 font-mono text-sm text-text-secondary">
              Map view content
            </TabsContent>
            <TabsContent value="table" className="pt-3 font-mono text-sm text-text-secondary">
              Table view content
            </TabsContent>
            <TabsContent value="flow" className="pt-3 font-mono text-sm text-text-secondary">
              Flow view content
            </TabsContent>
          </Tabs>
        </Section>

        <Section title="Tooltip & Modal">
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon">
                  <MapPin className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>SEC5-JN-CAM-014 — Webel More</TooltipContent>
            </Tooltip>

            <Modal>
              <ModalTrigger asChild>
                <Button variant="secondary">Open Modal</Button>
              </ModalTrigger>
              <ModalContent>
                <ModalHeader>
                  <ModalTitle>Acknowledge Alert</ModalTitle>
                </ModalHeader>
                <ModalBody className="font-mono text-sm text-text-secondary">
                  Watchlisted vehicle WB05CF3475 detected at SEC1-JN-CAM-001.
                </ModalBody>
                <ModalFooter>
                  <Button variant="ghost">Dismiss</Button>
                  <Button variant="primary">Acknowledge</Button>
                </ModalFooter>
              </ModalContent>
            </Modal>
          </div>
        </Section>

        <Section title="Table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plate</TableHead>
                <TableHead>Camera</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow interactive>
                <TableCell>WB 20 AB 1234</TableCell>
                <TableCell>SEC5-JN-CAM-014</TableCell>
                <TableCell>Car</TableCell>
                <TableCell>0.94</TableCell>
              </TableRow>
              <TableRow interactive>
                <TableCell>MH 12 DE 5678</TableCell>
                <TableCell>SEC3-JN-CAM-012</TableCell>
                <TableCell>Motorcycle</TableCell>
                <TableCell>0.88</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Section>

        <Section title="Empty state & skeleton">
          <div className="grid grid-cols-2 gap-4">
            <EmptyState
              icon={<ShieldAlert className="h-6 w-6" />}
              title="No open alerts"
              description="The city is quiet — new alerts will appear here in real time."
            />
            <Card>
              <CardHeader>
                <CardTitle>Loading detections…</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section title="Card">
          <Card className="max-w-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-cyan-400" /> SEC5-JN-CAM-014
              </CardTitle>
              <Badge tone="green" dot>
                Online
              </Badge>
            </CardHeader>
            <CardContent className="font-mono text-sm text-text-secondary">
              Webel More · Sector 5 · Facing North
            </CardContent>
          </Card>
        </Section>
      </div>
    </TooltipProvider>
  );
}
